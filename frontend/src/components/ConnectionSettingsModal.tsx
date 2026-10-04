import React, { useState, useEffect } from 'react';
import {
  X,
  Globe,
  Wifi,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Radio,
  Shield,
  Terminal,
  Zap,
  Flame,
  Gauge,
  RotateCcw
} from 'lucide-react';
import { ConnectionDiagnostics, ConnectionState } from '../types';
import { getApiBase, getWsBase, setCustomEndpoints, resetEndpoints, checkBackendConnection } from '../services/api';
import { getMqttBrokerUrl, setCustomMqttBroker, mqttService, DEFAULT_MQTT_BROKER_WSS } from '../services/mqttClient';
import { simulatorEngine } from '../services/simulatorEngine';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  diagnostics: ConnectionDiagnostics;
  onReconnect: () => void;
}

export const ConnectionSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  diagnostics,
  onReconnect
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'network' | 'twin' | 'neon'>('network');
  const [customApi, setCustomApi] = useState(getApiBase());
  const [customWs, setCustomWs] = useState(getWsBase());
  const [customMqtt, setCustomMqtt] = useState(getMqttBrokerUrl());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  
  const [mqttState, setMqttState] = useState<ConnectionState>(mqttService.getState());
  const [mqttLatency, setMqttLatency] = useState<number | null>(mqttService.getLatency());
  const [simRunning, setSimRunning] = useState<boolean>(simulatorEngine.isSimulating());
  const [injectedStatus, setInjectedStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = mqttService.onState((state, _url, lat) => {
      setMqttState(state);
      setMqttLatency(lat || null);
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await checkBackendConnection(customApi);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || "Failed to reach host" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setCustomEndpoints(customApi, customWs);
    setCustomMqttBroker(customMqtt);
    mqttService.connect(customMqtt);
    onReconnect();
    onClose();
  };

  const handleResetToAuto = () => {
    resetEndpoints();
    setCustomMqttBroker(DEFAULT_MQTT_BROKER_WSS);
    setCustomApi(getApiBase());
    setCustomWs(getWsBase());
    setCustomMqtt(DEFAULT_MQTT_BROKER_WSS);
    mqttService.connect(DEFAULT_MQTT_BROKER_WSS);
    onReconnect();
    onClose();
  };

  const handleInject = (devId: string, anomaly: 'OVERHEAT' | 'PRESSURE_DROP' | 'GAS_LEAK' | 'VIBRATION_SPIKE', label: string) => {
    simulatorEngine.injectAnomaly(devId, anomaly);
    setInjectedStatus(`Injected ${label} on ${devId}`);
    setTimeout(() => setInjectedStatus(null), 4000);
  };

  const handleClearAnomalies = () => {
    ['grid-substation-01', 'hvac-chiller-01', 'water-pump-01', 'env-gas-detector-03'].forEach(id => {
      simulatorEngine.clearAnomaly(id);
    });
    setInjectedStatus("All virtual device physics reset to nominal baseline.");
    setTimeout(() => setInjectedStatus(null), 4000);
  };

  const getStateBadge = (state: ConnectionState) => {
    switch (state) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            CONNECTED (HEALTHY)
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            DEGRADED (PARTIAL)
          </span>
        );
      case 'RECONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            RECONNECTING
          </span>
        );
      case 'CONNECTING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
            CONNECTING...
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            OFFLINE (DISCONNECTED)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Vercel, MQTT & Digital Twin Control
              </h3>
              <p className="text-[11px] text-slate-400">Public Telemetry, Serverless Persistence & Physics Twin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close Connectivity Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="px-6 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 pt-2">
          <button
            onClick={() => setActiveSubTab('network')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
              activeSubTab === 'network'
                ? 'bg-slate-900 text-cyan-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Network & MQTT
          </button>
          <button
            onClick={() => setActiveSubTab('twin')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
              activeSubTab === 'twin'
                ? 'bg-slate-900 text-cyan-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Digital Twin Physics (25 Nodes)
          </button>
          <button
            onClick={() => setActiveSubTab('neon')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors border-t border-x ${
              activeSubTab === 'neon'
                ? 'bg-slate-900 text-cyan-400 border-slate-700'
                : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            Neon PostgreSQL
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
          
          {activeSubTab === 'network' && (
            <>
              {/* Status Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-slate-400 mb-1 font-semibold uppercase">API Gateway Status</div>
                  {getStateBadge(diagnostics.state)}
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 mb-1 font-semibold uppercase">MQTT Broker (TLS)</div>
                  {getStateBadge(mqttState)}
                </div>
                <div className="text-right font-mono text-[11px] space-y-1">
                  <div className="text-slate-400">
                    HTTP Latency: <strong className="text-cyan-400">{diagnostics.latencyMs !== null ? `${diagnostics.latencyMs} ms` : 'N/A'}</strong>
                  </div>
                  <div className="text-slate-400">
                    MQTT Latency: <strong className="text-cyan-400">{mqttLatency !== null ? `${mqttLatency} ms` : 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* Diagnostics Error Alert */}
              {diagnostics.errorMessage && (
                <div className="bg-red-950/40 border border-red-800/80 rounded-lg p-3 text-red-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Connection Notice:</strong>
                    <span className="text-[11px] text-red-300/90">{diagnostics.errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Backend REST API Base URL (HTTP / HTTPS):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customApi}
                      onChange={(e) => setCustomApi(e.target.value)}
                      placeholder="e.g. https://your-project.vercel.app or http://127.0.0.1:8000"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                    />
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 rounded-lg border border-slate-600 font-bold transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                      <span>{testing ? 'Testing...' : 'Test API'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    Secure MQTT-over-WebSocket Broker (TLS WSS):
                  </label>
                  <input
                    type="text"
                    value={customMqtt}
                    onChange={(e) => setCustomMqtt(e.target.value)}
                    placeholder="wss://broker.emqx.io:8084/mqtt"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Namespace: <code className="text-cyan-400">pxt/sec26_prod/#</code> | Standard secure TLS connection over WebSockets port 8084.
                  </p>
                </div>
              </div>

              {/* Test Result Box */}
              {testResult && (
                <div className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                  testResult.success
                    ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                    : 'bg-red-950/50 border-red-700 text-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                    <span>
                      {testResult.success
                        ? `Connected to Vercel Functions API! Latency: ${testResult.latencyMs} ms`
                        : `API connection failed: ${testResult.error}`}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {activeSubTab === 'twin' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 text-sm">Browser-Based Digital Twin Engine</div>
                  <p className="text-slate-400 text-[11px]">
                    25 virtual nodes generating realistic Gaussian physics, diurnal loads, and SCADA metrics.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (simRunning) {
                      simulatorEngine.stop();
                      setSimRunning(false);
                    } else {
                      simulatorEngine.start();
                      setSimRunning(true);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold border text-xs transition-colors ${
                    simRunning
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                      : 'bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900'
                  }`}
                >
                  {simRunning ? 'SIMULATION RUNNING' : 'SIMULATION PAUSED'}
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Real-Time Anomaly & Fault Injection Controls</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => handleInject('grid-substation-01', 'OVERHEAT', 'Transformer Overheat (92.4°C)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-700 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-red-400 text-[11px] flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Overheat Transformer T1
                    </div>
                    <div className="text-[10px] text-slate-400">Oil Temp 92.4°C (Threshold 85°C)</div>
                  </button>

                  <button
                    onClick={() => handleInject('hvac-chiller-01', 'PRESSURE_DROP', 'Chiller Low Pressure (38.2 PSI)')}
                    className="p-2.5 bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-700 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                      <Gauge className="w-3 h-3" /> Drop Chiller Pressure
                    </div>
                    <div className="text-[10px] text-slate-400">Pressure 38.2 PSI (Threshold 45 PSI)</div>
                  </button>

                  <button
                    onClick={() => handleInject('env-gas-detector-03', 'GAS_LEAK', 'Methane Leak (14.8% LEL)')}
                    className="p-2.5 bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-700 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-red-400 text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Methane Gas Leak Spike
                    </div>
                    <div className="text-[10px] text-slate-400">LEL 14.8% (Threshold 5.0%)</div>
                  </button>

                  <button
                    onClick={() => handleInject('water-pump-01', 'VIBRATION_SPIKE', 'Pump Motor Vibration (7.9 mm/s)')}
                    className="p-2.5 bg-slate-900 hover:bg-amber-950/60 border border-slate-800 hover:border-amber-700 rounded-lg text-left transition-colors"
                  >
                    <div className="font-bold text-amber-400 text-[11px] flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Pump Vibration Anomaly
                    </div>
                    <div className="text-[10px] text-slate-400">Vibration 7.9 mm/s (Threshold 5.0 mm/s)</div>
                  </button>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={handleClearAnomalies}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Devices to Nominal Physics</span>
                  </button>

                  {injectedStatus && (
                    <span className="text-emerald-400 font-semibold text-[11px] animate-pulse">
                      {injectedStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'neon' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Neon Serverless PostgreSQL Database</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Persistent relational storage for devices, telemetry history, active alerts, automation rules, and security audit logs.
                </p>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Driver:</span>
                    <span className="text-emerald-400 font-bold">asyncpg (Async Engine)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Connection Pooling:</span>
                    <span className="text-cyan-400 font-bold">pool_pre_ping=True, pool_size=5, max_overflow=10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SSL Mode:</span>
                    <span className="text-emerald-400 font-bold">require (TLS Encrypted)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Auto-Scaling:</span>
                    <span className="text-cyan-400 font-bold">Zero-Dormancy Serverless Compute</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preset Quick Actions */}
          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetToAuto}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 text-[11px] font-semibold transition-colors"
                title="Reset to environment / origin defaults"
              >
                Reset to Auto-Detection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-cyan-500/20"
              >
                Save & Apply
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
