import { Device, TelemetryRecord, Alert, AlertSummary, SystemEvent, AutomationRule, AutomationHistory, CommandRecord, SystemHealth } from '../types';

const getApiBase = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.host}`;
  }
  return "http://127.0.0.1:8000";
};

const getWsBase = (): string => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL;
  }
  const apiBase = getApiBase();
  if (apiBase.startsWith("https://")) {
    return apiBase.replace("https://", "wss://") + "/ws";
  }
  if (apiBase.startsWith("http://")) {
    return apiBase.replace("http://", "ws://") + "/ws";
  }
  return "ws://127.0.0.1:8000/ws";
};

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

let token: string | null = localStorage.getItem("pxt_token");

export function setAuthToken(newToken: string) {
  token = newToken;
  localStorage.setItem("pxt_token", newToken);
}

export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function fetchSystemMode(): Promise<{ mode: string; description: string }> {
  const res = await fetch(`${API_BASE}/api/system/mode`);
  return res.json();
}

export async function setSystemMode(mode: 'SIMULATION' | 'PHYSICAL_HARDWARE'): Promise<void> {
  await fetch(`${API_BASE}/api/system/mode`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ mode })
  });
}

export async function fetchDevices(domain?: string, status?: string): Promise<Device[]> {
  let url = `${API_BASE}/api/devices`;
  const params = new URLSearchParams();
  if (domain) params.append("domain", domain);
  if (status) params.append("status", status);
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url);
  return res.json();
}

export async function fetchDevice(deviceId: string): Promise<Device> {
  const res = await fetch(`${API_BASE}/api/devices/${deviceId}`);
  return res.json();
}

export async function sendDeviceCommand(deviceId: string, action: string, parameters: Record<string, any> = {}): Promise<{ command_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/devices/${deviceId}/command`, {
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
  await fetch(`${API_BASE}/api/telemetry/ingest`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      device_id: deviceId,
      is_physical_hardware: true,
      metrics: metrics
    })
  });
}

export async function fetchLatestTelemetry(deviceId?: string): Promise<TelemetryRecord[]> {
  let url = `${API_BASE}/api/telemetry/latest`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchTelemetryHistory(deviceId: string, metricName?: string): Promise<TelemetryRecord[]> {
  let url = `${API_BASE}/api/telemetry/history/${deviceId}`;
  if (metricName) url += `?metric_name=${metricName}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchAlerts(acknowledged?: boolean, resolved?: boolean): Promise<Alert[]> {
  let url = `${API_BASE}/api/alerts`;
  const params = new URLSearchParams();
  if (acknowledged !== undefined) params.append("acknowledged", String(acknowledged));
  if (resolved !== undefined) params.append("resolved", String(resolved));
  if (params.toString()) url += `?${params.toString()}`;
  
  const res = await fetch(url);
  return res.json();
}

export async function fetchAlertSummary(): Promise<AlertSummary> {
  const res = await fetch(`${API_BASE}/api/alerts/summary`);
  return res.json();
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
  await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export async function resolveAlert(alertId: number): Promise<void> {
  await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export async function fetchEvents(deviceId?: string): Promise<SystemEvent[]> {
  let url = `${API_BASE}/api/events`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchAutomationRules(): Promise<AutomationRule[]> {
  const res = await fetch(`${API_BASE}/api/automation/rules`);
  return res.json();
}

export async function toggleAutomationRule(ruleId: number): Promise<void> {
  await fetch(`${API_BASE}/api/automation/rules/${ruleId}/toggle`, {
    method: "POST",
    headers: getAuthHeaders()
  });
}

export async function fetchAutomationHistory(): Promise<AutomationHistory[]> {
  const res = await fetch(`${API_BASE}/api/automation/history`);
  return res.json();
}

export async function fetchCommands(deviceId?: string): Promise<CommandRecord[]> {
  let url = `${API_BASE}/api/commands`;
  if (deviceId) url += `?device_id=${deviceId}`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchAuditLogs(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/api/audit`);
  return res.json();
}

export async function loginUser(username: string, password: string): Promise<{ access_token: string; role: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
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

export function subscribeWebSocket(onMessage: (msg: { type: string; data: any }) => void): () => void {
  let ws: WebSocket | null = null;
  let isClosed = false;

  const connect = () => {
    ws = new WebSocket(WS_BASE);
    ws.onmessage = (evt) => {
      try {
        const parsed = JSON.parse(evt.data);
        onMessage(parsed);
      } catch (err) {
        console.error("WS message error:", err);
      }
    };
    ws.onclose = () => {
      if (!isClosed) {
        setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return () => {
    isClosed = true;
    if (ws) ws.close();
  };
}
