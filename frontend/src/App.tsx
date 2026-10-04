import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Overview } from './pages/Overview';
import { DeviceList } from './pages/DeviceList';
import { DeviceDetail } from './pages/DeviceDetail';
import { Topology } from './pages/Topology';
import { AlertsPage } from './pages/Alerts';
import { AutomationPage } from './pages/Automation';
import { AuditLogsPage } from './pages/AuditLogs';
import { SystemHealthPage } from './pages/SystemHealthPage';
import {
  Device,
  Alert,
  AlertSummary,
  SystemHealth,
  SystemConfig,
  TelemetryRecord,
  SystemEvent,
  ConnectionState,
  ConnectionDiagnostics
} from './types';
import {
  fetchDevices,
  fetchAlerts,
  fetchAlertSummary,
  fetchHealth,
  fetchConfig,
  fetchLatestTelemetry,
  fetchEvents,
  fetchSystemMode,
  setSystemMode,
  sendDeviceCommand,
  acknowledgeAlert,
  resolveAlert,
  subscribeWebSocket,
  loginUser,
  connectionManager
} from './services/api';
import { mqttService } from './services/mqttClient';
import { simulatorEngine, INITIAL_VIRTUAL_DEVICES } from './services/simulatorEngine';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  // Seed initial 25 devices immediately from digital twin so UI is never blank
  const [devices, setDevices] = useState<Device[]>(() => simulatorEngine.getDevices());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRecord[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [systemMode, setSystemModeState] = useState<string>('SIMULATION');

  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnostics>(connectionManager.getDiagnostics());
  const wsControlRef = useRef<{ unsubscribe: () => void; reconnect: () => void } | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      const [dData, aData, sumData, hData, tData, eData, mData, cData] = await Promise.all([
        fetchDevices().catch(err => { console.warn("Devices fetch error:", err); return []; }),
        fetchAlerts().catch(err => { console.warn("Alerts fetch error:", err); return []; }),
        fetchAlertSummary().catch(err => { console.warn("Alert summary fetch error:", err); return null; }),
        fetchHealth().catch(err => { console.warn("Health fetch error:", err); return null; }),
        fetchLatestTelemetry().catch(err => { console.warn("Telemetry fetch error:", err); return []; }),
        fetchEvents().catch(err => { console.warn("Events fetch error:", err); return []; }),
        fetchSystemMode().catch(err => { console.warn("System mode fetch error:", err); return { mode: 'SIMULATION', description: '' }; }),
        fetchConfig().catch(err => { console.warn("Config fetch error:", err); return null; })
      ]);

      if (dData.length > 0) {
        setDevices(dData);
      }
      if (aData.length > 0) {
        setAlerts(prev => {
          // Merge unique alerts
          const existingIds = new Set(prev.map(a => a.id));
          const newAlerts = aData.filter((a: Alert) => !existingIds.has(a.id));
          return [...newAlerts, ...prev];
        });
      }
      if (sumData) setAlertSummary(sumData);
      if (hData) setHealth(hData);
      if (tData.length > 0) {
        setTelemetry(prev => {
          const merged = [...tData, ...prev];
          const seen = new Set();
          return merged.filter(item => {
            const k = `${item.device_id}_${item.metric_name}_${item.timestamp}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }).slice(0, 100);
        });
      }
      if (eData.length > 0) setEvents(eData);
      if (mData?.mode) setSystemModeState(mData.mode);
      if (cData) setConfig(cData);
    } catch (err) {
      console.warn("REST Sync notice:", err);
    }
  }, []);

  const handleReconnect = useCallback(() => {
    connectionManager.resetRetryCount();
    mqttService.connect();
    if (wsControlRef.current) {
      wsControlRef.current.reconnect();
    }
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    // 1. Subscribe to connection state changes
    const unsubDiag = connectionManager.subscribe((diag) => {
      setDiagnostics(diag);
    });

    // 2. Auto-login default viewer credentials
    loginUser("admin", "admin123").catch(err => console.log("Login auto-init:", err));

    // 3. Start Browser Digital Twin Simulation Engine
    simulatorEngine.start(2500);

    const unsubSimTelemetry = simulatorEngine.onTelemetry((record) => {
      setTelemetry(prev => [record, ...prev.slice(0, 99)]);
    });

    const unsubSimDevice = simulatorEngine.onDeviceUpdate((updatedDev) => {
      setDevices(prev => prev.map(d => d.id === updatedDev.id ? updatedDev : d));
    });

    const unsubSimAlert = simulatorEngine.onAlert((newAlert) => {
      setAlerts(prev => {
        if (prev.some(a => a.id === newAlert.id || (a.title === newAlert.title && Math.abs(a.created_at - newAlert.created_at) < 5))) {
          return prev;
        }
        return [newAlert, ...prev];
      });
      setAlertSummary(prev => prev ? { ...prev, active_unresolved: prev.active_unresolved + 1 } : null);
    });

    // 4. Connect Public Secure MQTT-over-WebSocket Client
    mqttService.connect();

    const unsubMqttTelemetry = mqttService.onTelemetry((record) => {
      setTelemetry(prev => [record, ...prev.slice(0, 99)]);
    });

    const unsubMqttStatus = mqttService.onStatusChange(({ device_id, status }) => {
      setDevices(prev => prev.map(d => d.id === device_id ? { ...d, status } : d));
    });

    const unsubMqttAlert = mqttService.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    // 5. Initial load from REST API
    loadAllData();

    // 6. Periodic HTTP sync with adaptive backoff
    const pollIntervalMs = diagnostics.state === 'OFFLINE' ? 30000 : 6000;
    const interval = setInterval(loadAllData, pollIntervalMs);

    // 7. Connect WebSocket telemetry stream if backend provides direct WS
    const wsControl = subscribeWebSocket(
      (msg) => {
        if (msg.type === "TELEMETRY_UPDATED") {
          setTelemetry(prev => [msg.data, ...prev.slice(0, 99)]);
        } else if (msg.type === "DEVICE_STATE_CHANGE") {
          setDevices(prev => prev.map(d => d.id === msg.data.device_id ? { ...d, status: msg.data.status } : d));
        } else if (msg.type === "ALERT_CREATED") {
          setAlerts(prev => [msg.data, ...prev]);
          fetchAlertSummary().then(setAlertSummary).catch(console.error);
        } else if (msg.type === "ALERT_ACKNOWLEDGED" || msg.type === "ALERT_RESOLVED") {
          fetchAlerts().then(setAlerts).catch(console.error);
          fetchAlertSummary().then(setAlertSummary).catch(console.error);
        } else if (msg.type === "SYSTEM_MODE_CHANGED") {
          setSystemModeState(msg.data.mode);
        }
      }
    );
    wsControlRef.current = wsControl;

    return () => {
      clearInterval(interval);
      unsubDiag();
      unsubSimTelemetry();
      unsubSimDevice();
      unsubSimAlert();
      unsubMqttTelemetry();
      unsubMqttStatus();
      unsubMqttAlert();
      wsControl.unsubscribe();
      mqttService.disconnect();
      simulatorEngine.stop();
    };
  }, [loadAllData, diagnostics.state]);

  const handleToggleSystemMode = async () => {
    const targetMode = systemMode === 'SIMULATION' ? 'PHYSICAL_HARDWARE' : 'SIMULATION';
    try {
      await setSystemMode(targetMode);
      setSystemModeState(targetMode);
    } catch (err) {
      console.warn("Notice toggling system mode via REST:", err);
      setSystemModeState(targetMode);
    }
  };

  const handleSendCommand = async (deviceId: string, action: string, params: any = {}) => {
    try {
      // 1. Send via REST if online
      sendDeviceCommand(deviceId, action, params).catch(err => console.warn("REST command fallback:", err));

      // 2. Publish to MQTT topic
      mqttService.publish(`command/${deviceId}`, { action, parameters: params, timestamp: Date.now() / 1000 });

      // 3. Actuate digital twin in browser
      if (action === "POWER_OFF") {
        simulatorEngine.setPower(deviceId, false);
      } else if (action === "POWER_ON" || action === "RESTART") {
        simulatorEngine.setPower(deviceId, true);
      }

      setTimeout(loadAllData, 800);
    } catch (err) {
      console.error("Error sending command:", err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      acknowledgeAlert(alertId).catch(err => console.warn("Alert ack REST notice:", err));
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
      setAlertSummary(prev => prev ? { ...prev, acknowledged: prev.acknowledged + 1 } : null);
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      resolveAlert(alertId).catch(err => console.warn("Alert resolve REST notice:", err));
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true, acknowledged: true } : a));
      setAlertSummary(prev => prev ? { ...prev, resolved: prev.resolved + 1, active_unresolved: Math.max(0, prev.active_unresolved - 1) } : null);
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setActiveTab('device-detail');
  };

  const activeAlertCount = alertSummary ? alertSummary.active_unresolved : alerts.filter(a => !a.acknowledged && !a.resolved).length;

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col font-sans text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'device-detail') setSelectedDeviceId(null);
        }}
        health={health}
        connectionState={diagnostics.state}
        diagnostics={diagnostics}
        activeAlertCount={activeAlertCount}
        systemMode={systemMode}
        onToggleMode={handleToggleSystemMode}
        onReconnect={handleReconnect}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <Overview
            devices={devices}
            alerts={alerts}
            alertSummary={alertSummary}
            health={health}
            telemetry={telemetry}
            events={events}
            connectionState={diagnostics.state}
            diagnostics={diagnostics}
            onSelectDevice={handleSelectDevice}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onRetryConnection={handleReconnect}
          />
        )}

        {activeTab === 'devices' && (
          <DeviceList
            devices={devices}
            onSelectDevice={handleSelectDevice}
            onSendCommand={handleSendCommand}
          />
        )}

        {activeTab === 'device-detail' && selectedDeviceId && (
          <DeviceDetail
            deviceId={selectedDeviceId}
            device={devices.find(d => d.id === selectedDeviceId) || null}
            onBack={() => setActiveTab('devices')}
            onSendCommand={handleSendCommand}
          />
        )}

        {activeTab === 'topology' && (
          <Topology
            devices={devices}
            health={health}
            onSelectDevice={handleSelectDevice}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPage
            alerts={alerts}
            alertSummary={alertSummary}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={handleResolveAlert}
          />
        )}

        {activeTab === 'automation' && <AutomationPage />}

        {activeTab === 'audit' && <AuditLogsPage />}

        {activeTab === 'system' && (
          <SystemHealthPage health={health} config={config} />
        )}
      </main>

      <footer className="bg-slate-950 border-t border-slate-800/80 py-3.5 font-mono text-xs text-slate-500 text-center">
        PXT SMART INFRASTRUCTURE | REAL-TIME IoT DIGITAL TWIN & SIMULATION PLATFORM | ELLIOT PXT SEC26
      </footer>
    </div>
  );
}
