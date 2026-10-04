import {
  Device,
  TelemetryRecord,
  Alert,
  AlertSummary,
  SystemEvent,
  AutomationRule,
  AutomationHistory,
  CommandRecord,
  SystemHealth,
  SystemConfig,
  ConnectionState,
  ConnectionDiagnostics
} from '../types';

// --- CONFIGURATION & ENDPOINT RESOLUTION ---

const STORAGE_KEY_API = "pxt_custom_api_base";
const STORAGE_KEY_WS = "pxt_custom_ws_base";

export function getStoredCustomApiBase(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_API);
  } catch {
    return null;
  }
}

export function getStoredCustomWsBase(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_WS);
  } catch {
    return null;
  }
}

export function getQueryParamOverride(param: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  } catch {
    return null;
  }
}

export function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  );
}

export function getApiBase(): string {
  // 1. URL Query parameter override (?api=https://...)
  const queryApi = getQueryParamOverride("api");
  if (queryApi) {
    return queryApi.replace(/\/$/, "");
  }

  // 2. User-configured Custom URL in LocalStorage
  const customApi = getStoredCustomApiBase();
  if (customApi) {
    return customApi.replace(/\/$/, "");
  }

  // 3. Build-time Vite environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }

  // 4. Runtime window hostname detection
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // In local development, connect to local backend port 8000
    if (isLocalHost(hostname)) {
      return "http://127.0.0.1:8000";
    }
    // In production / deployed environment (e.g. Vercel, Netlify, Render, Railway, custom domain):
    // Fallback to current origin (works when reverse proxied, containerized, or same host)
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.host}`;
  }

  return "http://127.0.0.1:8000";
}

export function getWsBase(): string {
  // 1. URL Query parameter override (?ws=wss://...)
  const queryWs = getQueryParamOverride("ws");
  if (queryWs) {
    return queryWs;
  }

  // 2. User-configured Custom WS in LocalStorage
  const customWs = getStoredCustomWsBase();
  if (customWs) {
    return customWs;
  }

  // 3. Build-time Vite environment variable
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }

  // 4. Derive from API Base URL
  const apiBase = getApiBase();
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://") + "/ws";
  }
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://") + "/ws";
  }

  return "ws://127.0.0.1:8000/ws";
}

export function setCustomEndpoints(apiBase: string, wsBase?: string): void {
  try {
    const cleanApi = apiBase.trim().replace(/\/$/, "");
    localStorage.setItem(STORAGE_KEY_API, cleanApi);
    if (wsBase && wsBase.trim()) {
      localStorage.setItem(STORAGE_KEY_WS, wsBase.trim());
    } else {
      if (cleanApi.startsWith("https://")) {
        localStorage.setItem(STORAGE_KEY_WS, cleanApi.replace("https://", "wss://") + "/ws");
      } else if (cleanApi.startsWith("http://")) {
        localStorage.setItem(STORAGE_KEY_WS, cleanApi.replace("http://", "ws://") + "/ws");
      }
    }
  } catch (err) {
    console.error("Failed to save custom endpoints to localStorage:", err);
  }
}

export function resetEndpoints(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_API);
    localStorage.removeItem(STORAGE_KEY_WS);
  } catch (err) {
    console.error("Failed to clear custom endpoints:", err);
  }
}

export function isCustomConfigured(): boolean {
  return Boolean(getStoredCustomApiBase() || getQueryParamOverride("api"));
}

// --- AUTH & TOKEN MANAGEMENT ---

let token: string | null = typeof window !== "undefined" ? localStorage.getItem("pxt_token") : null;

export function setAuthToken(newToken: string): void {
  token = newToken;
  try {
    localStorage.setItem("pxt_token", newToken);
  } catch {
    // Ignore storage errors in private mode
  }
}

export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// --- HTTP CLIENT WITH TIMEOUT & ERROR RESILIENCE ---

const DEFAULT_FETCH_TIMEOUT_MS = 6000;

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms for ${url}`);
    }
    throw error;
  }
}

// --- CONNECTION STATE MANAGER ---

type ConnectionStateListener = (diag: ConnectionDiagnostics) => void;

class ConnectionStateManager {
  private state: ConnectionState = 'CONNECTING';
  private latencyMs: number | null = null;
  private lastSuccessfulSync: number | null = null;
  private retryAttempt: number = 0;
  private maxRetries: number = 5;
  private errorMessage: string | null = null;
  private listeners: Set<ConnectionStateListener> = new Set();
  private wsConnected: boolean = false;
  private httpConnected: boolean = false;

  public getState(): ConnectionState {
    return this.state;
  }

  public getDiagnostics(): ConnectionDiagnostics {
    return {
      state: this.state,
      apiBase: getApiBase(),
      wsBase: getWsBase(),
      latencyMs: this.latencyMs,
      lastSuccessfulSync: this.lastSuccessfulSync,
      retryAttempt: this.retryAttempt,
      maxRetries: this.maxRetries,
      errorMessage: this.errorMessage,
      isCustomUrl: isCustomConfigured()
    };
  }

  public subscribe(listener: ConnectionStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getDiagnostics());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const diag = this.getDiagnostics();
    this.listeners.forEach(fn => {
      try {
        fn(diag);
      } catch (e) {
        console.error("Error in connection state listener:", e);
      }
    });
  }

  public recordHttpSuccess(latency: number) {
    this.httpConnected = true;
    this.latencyMs = latency;
    this.lastSuccessfulSync = Date.now();
    this.errorMessage = null;
    this.retryAttempt = 0;

    // HTTP REST API is fully operational
    this.state = 'CONNECTED';
    this.notify();
  }

  public recordHttpFailure(error: any) {
    this.httpConnected = false;
    this.errorMessage = error?.message || "HTTP Connection Failed";
    this.retryAttempt += 1;

    if (this.retryAttempt >= this.maxRetries && !this.wsConnected) {
      this.state = 'OFFLINE';
    } else {
      this.state = 'RECONNECTING';
    }
    this.notify();
  }

  public recordWsConnected() {
    this.wsConnected = true;
    this.lastSuccessfulSync = Date.now();
    this.retryAttempt = 0;
    this.state = 'CONNECTED';
    this.notify();
  }

  public recordWsDisconnected(detail?: string) {
    this.wsConnected = false;
    if (detail) this.errorMessage = detail;

    if (this.httpConnected) {
      // Serverless REST API polling handles telemetry gracefully
      this.state = 'CONNECTED';
    } else if (this.retryAttempt >= this.maxRetries) {
      this.state = 'OFFLINE';
    } else {
      this.state = 'RECONNECTING';
    }
    this.notify();
  }

  public resetRetryCount() {
    this.retryAttempt = 0;
    this.state = 'CONNECTING';
    this.notify();
  }
}

export const connectionManager = new ConnectionStateManager();

// --- PUBLIC REST API METHODS ---

export async function checkBackendConnection(targetUrl?: string): Promise<{ success: boolean; latencyMs: number; health?: SystemHealth; error?: string }> {
  const base = (targetUrl || getApiBase()).replace(/\/$/, "");
  const startTime = Date.now();
  try {
    const res = await fetchWithTimeout(`${base}/api/health`, {}, 4000);
    const latency = Date.now() - startTime;
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return { success: true, latencyMs: latency, health: data };
  } catch (err: any) {
    return { success: false, latencyMs: Date.now() - startTime, error: err.message || "Failed to reach backend" };
  }
}

export async function fetchConfig(): Promise<SystemConfig> {
  const url = `${getApiBase()}/api/config`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch config (${res.status})`);
  }
  return res.json();
}

export async function fetchHealth(): Promise<SystemHealth> {
  const startTime = Date.now();
  const url = `${getApiBase()}/api/health`;
  try {
    const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
    const latency = Date.now() - startTime;
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    const data = await res.json();
    connectionManager.recordHttpSuccess(latency);
    return data;
  } catch (err) {
    connectionManager.recordHttpFailure(err);
    throw err;
  }
}

export async function fetchHealthDiagnostics(): Promise<any> {
  const url = `${getApiBase()}/api/health/diagnostics`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Diagnostics returned status ${res.status}`);
  return res.json();
}

export async function fetchSystemMode(): Promise<{ mode: string; description: string }> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/system/mode`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch system mode (${res.status})`);
  return res.json();
}

export async function setSystemMode(mode: 'SIMULATION' | 'PHYSICAL_HARDWARE'): Promise<void> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/system/mode`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error(`Failed to set system mode (${res.status})`);
}

export async function fetchDevices(domain?: string, status?: string): Promise<Device[]> {
  let url = `${getApiBase()}/api/devices`;
  const params = new URLSearchParams();
  if (domain && domain !== 'ALL') params.append("domain", domain);
  if (status && status !== 'ALL') params.append("status", status);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/devices/${deviceId}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Device not found (${res.status})`);
  return res.json();
}

export async function sendDeviceCommand(deviceId: string, action: string, parameters: Record<string, any> = {}): Promise<{ command_id: string; status: string }> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/devices/${deviceId}/command`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, parameters })
  });
  if (!res.ok) {
    throw new Error(`Command failed with status ${res.status}`);
  }
  return res.json();
}

export async function ingestHardwareTelemetry(deviceId: string, metrics: Record<string, any>): Promise<void> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/telemetry/ingest`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      device_id: deviceId,
      is_physical_hardware: true,
      metrics: metrics
    })
  });
  if (!res.ok) throw new Error(`Hardware ingestion failed (${res.status})`);
}

export async function fetchLatestTelemetry(deviceId?: string): Promise<TelemetryRecord[]> {
  let url = `${getApiBase()}/api/telemetry/latest`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch telemetry (${res.status})`);
  return res.json();
}

export async function fetchTelemetryHistory(deviceId: string, metricName?: string): Promise<TelemetryRecord[]> {
  let url = `${getApiBase()}/api/telemetry/history/${deviceId}`;
  if (metricName) url += `?metric_name=${metricName}`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
  return res.json();
}

export async function fetchAlerts(acknowledged?: boolean, resolved?: boolean): Promise<Alert[]> {
  let url = `${getApiBase()}/api/alerts`;
  const params = new URLSearchParams();
  if (acknowledged !== undefined) params.append("acknowledged", String(acknowledged));
  if (resolved !== undefined) params.append("resolved", String(resolved));
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch alerts (${res.status})`);
  return res.json();
}

export async function fetchAlertSummary(): Promise<AlertSummary> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/alerts/summary`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch alert summary (${res.status})`);
  return res.json();
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/alerts/${alertId}/acknowledge`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to acknowledge alert (${res.status})`);
}

export async function resolveAlert(alertId: number): Promise<void> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/alerts/${alertId}/resolve`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to resolve alert (${res.status})`);
}

export async function fetchEvents(deviceId?: string): Promise<SystemEvent[]> {
  let url = `${getApiBase()}/api/events`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch events (${res.status})`);
  return res.json();
}

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/automation/rules`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch automation rules (${res.status})`);
  return res.json();
}

export async function toggleAutomationRule(ruleId: number): Promise<void> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/automation/rules/${ruleId}/toggle`, {
    method: "POST",
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error(`Failed to toggle rule (${res.status})`);
}

export async function fetchAutomationHistory(): Promise<AutomationHistory[]> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/automation/history`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch automation history (${res.status})`);
  return res.json();
}

export async function fetchCommands(deviceId?: string): Promise<CommandRecord[]> {
  let url = `${getApiBase()}/api/commands`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetchWithTimeout(url, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch commands (${res.status})`);
  return res.json();
}

export async function fetchAuditLogs(): Promise<any[]> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/audit`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
  return res.json();
}

export async function loginUser(username: string, password: string): Promise<{ access_token: string; role: string }> {
  const res = await fetchWithTimeout(`${getApiBase()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    throw new Error("Invalid username or password");
  }
  const data = await res.json();
  setAuthToken(data.access_token);
  return data;
}

// --- RESILIENT WEBSOCKET SUBSCRIPTION WITH BOUNDED RETRIES & EXPONENTIAL BACKOFF ---

export function subscribeWebSocket(
  onMessage: (msg: { type: string; data: any }) => void,
  onStateChange?: (state: ConnectionState) => void
): { unsubscribe: () => void; reconnect: () => void } {
  let ws: WebSocket | null = null;
  let isClosed = false;
  let retryCount = 0;
  let reconnectTimeoutId: any = null;
  const MAX_RETRIES = 6;
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 20000;

  const calculateBackoff = (attempt: number): number => {
    const delay = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(1.5, Math.min(attempt, 8)));
    // Add jitter
    return delay + Math.floor(Math.random() * 500);
  };

  const connect = () => {
    if (isClosed) return;

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }

    const wsUrl = getWsBase();
    try {
      ws = new WebSocket(wsUrl);

      // Connection timeout watchdog
      const connectionWatchdog = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          console.warn(`WebSocket connection timed out for ${wsUrl}`);
          ws.close();
        }
      }, 6000);

      ws.onopen = () => {
        clearTimeout(connectionWatchdog);
        retryCount = 0;
        connectionManager.recordWsConnected();
        if (onStateChange) onStateChange(connectionManager.getState());
      };

      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          onMessage(parsed);
        } catch (err) {
          console.error("WS message parse error:", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WebSocket communication error on", wsUrl, err);
      };

      ws.onclose = (evt) => {
        clearTimeout(connectionWatchdog);
        if (isClosed) return;

        connectionManager.recordWsDisconnected(evt.reason || `Code: ${evt.code}`);
        if (onStateChange) onStateChange(connectionManager.getState());

        retryCount += 1;
        if (retryCount <= MAX_RETRIES) {
          const delay = calculateBackoff(retryCount);
          reconnectTimeoutId = setTimeout(connect, delay);
        } else {
          // Stay in OFFLINE state; background periodic probe every 30s
          reconnectTimeoutId = setTimeout(connect, 30000);
        }
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket connection:", err);
      connectionManager.recordWsDisconnected(String(err));
      if (onStateChange) onStateChange(connectionManager.getState());
      retryCount += 1;
      reconnectTimeoutId = setTimeout(connect, calculateBackoff(retryCount));
    }
  };

  connect();

  return {
    unsubscribe: () => {
      isClosed = true;
      if (reconnectTimeoutId) clearTimeout(reconnectTimeoutId);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    },
    reconnect: () => {
      retryCount = 0;
      connectionManager.resetRetryCount();
      if (ws) {
        ws.close();
      } else {
        connect();
      }
    }
  };
}
