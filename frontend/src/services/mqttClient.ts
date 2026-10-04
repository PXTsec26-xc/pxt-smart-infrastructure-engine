import mqtt, { MqttClient } from 'mqtt';
import { ConnectionState, TelemetryRecord, Alert, Device } from '../types';

export interface MqttMessagePayload {
  topic: string;
  payload: any;
  timestamp: number;
}

export type MqttTelemetryHandler = (record: TelemetryRecord) => void;
export type MqttDeviceStatusHandler = (update: { device_id: string; status: Device['status']; last_seen: number }) => void;
export type MqttAlertHandler = (alert: Alert) => void;
export type MqttStateChangeHandler = (state: ConnectionState, brokerUrl: string, latencyMs?: number) => void;

const STORAGE_KEY_MQTT_BROKER = "pxt_custom_mqtt_broker";
export const PUBLIC_MQTT_FALLBACKS = [
  "wss://broker.emqx.io:8084/mqtt",
  "wss://test.mosquitto.org:8081",
  "wss://broker.hivemq.com:8884/mqtt"
];
export const DEFAULT_MQTT_BROKER_WSS = PUBLIC_MQTT_FALLBACKS[0];
export const MQTT_TOPIC_PREFIX = "pxt/sec26_prod";

export function getStoredCustomMqttBroker(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_MQTT_BROKER);
  } catch {
    return null;
  }
}

export function setCustomMqttBroker(brokerUrl: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MQTT_BROKER, brokerUrl.trim());
  } catch (err) {
    console.error("Failed to save custom MQTT broker URL:", err);
  }
}

export function getMqttBrokerUrl(): string {
  // 1. URL Query parameter override (?mqtt=wss://...)
  if (typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryMqtt = urlParams.get("mqtt");
      if (queryMqtt) return queryMqtt;
    } catch {}
  }

  // 2. Custom override in LocalStorage
  const custom = getStoredCustomMqttBroker();
  if (custom) return custom;

  // 3. Vite environment variable
  if (import.meta.env.VITE_MQTT_BROKER_WSS) {
    return import.meta.env.VITE_MQTT_BROKER_WSS;
  }

  // 4. Default public secure TLS MQTT-over-WebSocket broker
  return DEFAULT_MQTT_BROKER_WSS;
}

class PxtMqttService {
  private client: MqttClient | null = null;
  private state: ConnectionState = 'CONNECTING';
  private fallbackIndex: number = 0;
  private brokerUrl: string = getMqttBrokerUrl();
  private retryCount: number = 0;
  private maxRetries: number = 8;
  private connectStartTime: number = 0;
  private latencyMs: number | null = null;
  private isManuallyClosed: boolean = false;

  private telemetryHandlers: Set<MqttTelemetryHandler> = new Set();
  private statusHandlers: Set<MqttDeviceStatusHandler> = new Set();
  private alertHandlers: Set<MqttAlertHandler> = new Set();
  private stateHandlers: Set<MqttStateChangeHandler> = new Set();

  constructor() {
    this.brokerUrl = getMqttBrokerUrl();
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public getBrokerUrl(): string {
    return this.brokerUrl;
  }

  public getLatency(): number | null {
    return this.latencyMs;
  }

  public isConnected(): boolean {
    return this.state === 'CONNECTED' && this.client !== null && this.client.connected;
  }

  public onTelemetry(handler: MqttTelemetryHandler): () => void {
    this.telemetryHandlers.add(handler);
    return () => this.telemetryHandlers.delete(handler);
  }

  public onStatusChange(handler: MqttDeviceStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  public onAlert(handler: MqttAlertHandler): () => void {
    this.alertHandlers.add(handler);
    return () => this.alertHandlers.delete(handler);
  }

  public onState(handler: MqttStateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.state, this.brokerUrl, this.latencyMs || undefined);
    return () => this.stateHandlers.delete(handler);
  }

  private notifyState(state: ConnectionState, latency?: number) {
    this.state = state;
    if (latency !== undefined) this.latencyMs = latency;
    this.stateHandlers.forEach(fn => {
      try {
        fn(this.state, this.brokerUrl, this.latencyMs || undefined);
      } catch (e) {
        console.error("Error in MQTT state listener:", e);
      }
    });
  }

  public connect(customUrl?: string): void {
    if (customUrl) {
      this.brokerUrl = customUrl;
    } else {
      this.brokerUrl = getMqttBrokerUrl();
    }

    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }

    this.isManuallyClosed = false;
    this.connectStartTime = Date.now();
    this.notifyState('CONNECTING');

    const clientId = `pxt_web_${Math.random().toString(16).substring(2, 10)}`;

    try {
      this.client = mqtt.connect(this.brokerUrl, {
        clientId,
        clean: true,
        connectTimeout: 7000,
        reconnectPeriod: 3000,
        keepalive: 30,
        rejectUnauthorized: false
      });

      this.client.on('connect', () => {
        this.latencyMs = Date.now() - this.connectStartTime;
        this.retryCount = 0;
        this.notifyState('CONNECTED', this.latencyMs);

        // Subscribe to all PXT production topics
        const subscriptionTopic = `${MQTT_TOPIC_PREFIX}/#`;
        this.client?.subscribe(subscriptionTopic, { qos: 0 }, (err) => {
          if (err) {
            console.warn("MQTT subscription error:", err);
          } else {
            console.info(`[MQTT] Subscribed to namespace: ${subscriptionTopic}`);
          }
        });
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        try {
          const payloadStr = message.toString();
          const parsed = JSON.parse(payloadStr);
          this.handleIncomingMessage(topic, parsed);
        } catch (err) {
          // Non-JSON payload fallback
        }
      });

      this.client.on('error', (err: Error) => {
        console.warn(`[MQTT] Broker communication error on ${this.brokerUrl}:`, err.message);
        if (this.state !== 'CONNECTED') {
          this.notifyState('DEGRADED');
        }
      });

      this.client.on('reconnect', () => {
        this.retryCount += 1;
        if (this.retryCount > this.maxRetries) {
          this.notifyState('OFFLINE');
        } else {
          this.notifyState('RECONNECTING');
        }
      });

      this.client.on('offline', () => {
        if (!this.isManuallyClosed) {
          this.notifyState('OFFLINE');
        }
      });

      this.client.on('close', () => {
        if (!this.isManuallyClosed && this.state !== 'OFFLINE') {
          this.notifyState('RECONNECTING');
        }
      });

    } catch (err: any) {
      console.error("[MQTT] Initialization failure:", err);
      this.notifyState('OFFLINE');
    }
  }

  private handleIncomingMessage(topic: string, data: any) {
    if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/telemetry/`)) {
      if (Array.isArray(data)) {
        data.forEach(item => this.emitTelemetry(item));
      } else if (data && typeof data === 'object') {
        this.emitTelemetry(data);
      }
    } else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/status/`)) {
      if (data && data.device_id && data.status) {
        this.statusHandlers.forEach(fn => {
          try { fn(data); } catch (e) { console.error(e); }
        });
      }
    } else if (topic.startsWith(`${MQTT_TOPIC_PREFIX}/alerts`)) {
      if (data && data.id && data.severity) {
        this.alertHandlers.forEach(fn => {
          try { fn(data); } catch (e) { console.error(e); }
        });
      }
    }
  }

  public emitTelemetry(record: TelemetryRecord) {
    this.telemetryHandlers.forEach(fn => {
      try { fn(record); } catch (e) { console.error(e); }
    });
  }

  public publish(subTopic: string, payload: any): boolean {
    if (!this.client || !this.client.connected) {
      return false;
    }
    const fullTopic = `${MQTT_TOPIC_PREFIX}/${subTopic.replace(/^\//, '')}`;
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    try {
      this.client.publish(fullTopic, payloadStr, { qos: 0 });
      return true;
    } catch (err) {
      console.warn(`[MQTT] Publish error on ${fullTopic}:`, err);
      return false;
    }
  }

  public publishTelemetry(deviceId: string, metrics: Array<{ metric_name: string; value: number; unit: string; timestamp?: number }>) {
    const ts = Date.now() / 1000;
    const records: TelemetryRecord[] = metrics.map((m, idx) => ({
      id: Math.floor(Math.random() * 1000000) + idx,
      device_id: deviceId,
      metric_name: m.metric_name,
      value: m.value,
      unit: m.unit,
      timestamp: m.timestamp || ts
    }));
    this.publish(`telemetry/${deviceId}`, records);
  }

  public publishDeviceStatus(deviceId: string, status: Device['status']) {
    this.publish(`status/${deviceId}`, {
      device_id: deviceId,
      status: status,
      last_seen: Date.now() / 1000
    });
  }

  public publishAlert(alert: Alert) {
    this.publish('alerts', alert);
  }

  public disconnect(): void {
    this.isManuallyClosed = true;
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
    this.notifyState('OFFLINE');
  }
}

export const mqttService = new PxtMqttService();
