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

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const [devices, setDevices] = useState<Device[]>([]);
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

      if (dData.length > 0) setDevices(dData);
      setAlerts(aData);
      if (sumData) setAlertSummary(sumData);
      if (hData) setHealth(hData);
      if (tData.length > 0) setTelemetry(tData);
      if (eData.length > 0) setEvents(eData);
      if (mData?.mode) setSystemModeState(mData.mode);
      if (cData) setConfig(cData);
    } catch (err) {
      console.error("Error loading system data:", err);
    }
  }, []);

  const handleReconnect = useCallback(() => {
    connectionManager.resetRetryCount();
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

    // 3. Initial load
    loadAllData();

    // 4. Periodic HTTP sync with adaptive backoff
    const pollIntervalMs = diagnostics.state === 'OFFLINE' ? 30000 : 5000;
    const interval = setInterval(loadAllData, pollIntervalMs);

    // 5. Connect WebSocket telemetry stream
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
      wsControl.unsubscribe();
    };
  }, [loadAllData, diagnostics.state]);

  const handleToggleSystemMode = async () => {
    const targetMode = systemMode === 'SIMULATION' ? 'PHYSICAL_HARDWARE' : 'SIMULATION';
    try {
      await setSystemMode(targetMode);
      setSystemModeState(targetMode);
    } catch (err) {
      console.error("Error toggling system mode:", err);
    }
  };

  const handleSendCommand = async (deviceId: string, action: string, params: any = {}) => {
    try {
      await sendDeviceCommand(deviceId, action, params);
      setTimeout(loadAllData, 800);
    } catch (err) {
      console.error("Error sending command:", err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await acknowledgeAlert(alertId);
      loadAllData();
    } catch (err) {
      console.error("Error acknowledging alert:", err);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    try {
      await resolveAlert(alertId);
      loadAllData();
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
