export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'MALFUNCTIONING' | 'STARTING' | 'MAINTENANCE';

export interface Device {
  id: string;
  name: string;
  device_type: string;
  domain: string;
  location: string;
  status: DeviceStatus;
  is_powered_on: boolean;
  last_seen: number;
  uptime: number;
  reconnect_count: number;
  created_at: number;
  updated_at: number;
}

export interface MetricReading {
  name: string;
  value: number;
  unit: string;
}

export interface TelemetryRecord {
  id: number;
  device_id: string;
  metric_name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface Alert {
  id: number;
  device_id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  description: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  resolved: boolean;
  created_at: number;
  resolved_at?: number;
}

export interface AlertSummary {
  active_unresolved: number;
  acknowledged: number;
  resolved: number;
  total_historical: number;
}

export interface SystemEvent {
  id: number;
  device_id: string;
  event_type: string;
  message: string;
  timestamp: number;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  target_device: string;
  metric_name: string;
  operator: '>' | '<' | '==' | '>=' | '<=' | '!=';
  threshold_val: number;
  action_type: string;
  action_params: string;
  trigger_count: number;
  last_triggered?: number;
}

export interface AutomationHistory {
  id: number;
  rule_id: number;
  rule_name: string;
  device_id: string;
  condition_met: string;
  action_executed: string;
  result_message: string;
  timestamp: number;
}

export interface CommandRecord {
  id: string;
  device_id: string;
  action: string;
  parameters: string;
  status: 'REQUESTED' | 'SENT' | 'ACKNOWLEDGED' | 'FAILED' | 'TIMED_OUT';
  message?: string;
  requested_at: number;
  acknowledged_at?: number;
}

export interface SystemHealth {
  status: string;
  mqtt_broker_connected: boolean;
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  active_alerts: number;
  timestamp: number;
}
