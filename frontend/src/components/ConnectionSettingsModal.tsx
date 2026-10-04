import React, { useState } from 'react';
import { X, Globe, Wifi, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity, Server, Radio, Shield, Terminal } from 'lucide-react';
import { ConnectionDiagnostics, ConnectionState } from '../types';
import { getApiBase, getWsBase, setCustomEndpoints, resetEndpoints, checkBackendConnection } from '../services/api';

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
  const [customApi, setCustomApi] = useState(getApiBase());
  const [customWs, setCustomWs] = useState(getWsBase());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);

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
    onReconnect();
    onClose();
  };

  const handleResetToAuto = () => {
    resetEndpoints();
    setCustomApi(getApiBase());
    setCustomWs(getWsBase());
    onReconnect();
    onClose();
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
            RECONNECTING (TRY {diagnostics.retryAttempt}/{diagnostics.maxRetries})
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
                Public Network & Telemetry Connectivity
              </h3>
              <p className="text-[11px] text-slate-400">PXT SCADA Telemetry Stream & REST Backend Configuration</p>
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

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Status Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-slate-400 mb-1 font-semibold uppercase">Current Connection Status</div>
              {getStateBadge(diagnostics.state)}
            </div>
            <div className="text-right sm:text-right w-full sm:w-auto font-mono text-[11px] space-y-1">
              <div className="text-slate-400">
                Roundtrip Latency: <strong className="text-cyan-400">{diagnostics.latencyMs !== null ? `${diagnostics.latencyMs} ms` : 'N/A'}</strong>
              </div>
              <div className="text-slate-400">
                Endpoint Mode: <strong className={diagnostics.isCustomUrl ? "text-amber-400" : "text-emerald-400"}>
                  {diagnostics.isCustomUrl ? "CUSTOM OVERRIDE" : "AUTO-RESOLVED"}
                </strong>
              </div>
            </div>
          </div>

          {/* Diagnostics Error Alert */}
          {diagnostics.errorMessage && (
            <div className="bg-red-950/40 border border-red-800/80 rounded-lg p-3 text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Connection Warning:</strong>
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
                  placeholder="e.g. https://pxt-backend.onrender.com or http://127.0.0.1:8000"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400 text-xs font-mono"
                />
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-400 rounded-lg border border-slate-600 font-bold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                For public visitors: Enter the public URL of your deployed FastAPI service. Never connect to a visitor's localhost in production.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                WebSocket Stream URL (WS / WSS):
              </label>
              <input
                type="text"
                value={customWs}
                onChange={(e) => setCustomWs(e.target.value)}
                placeholder="e.g. wss://pxt-backend.onrender.com/ws or ws://127.0.0.1:8000/ws"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400 text-xs font-mono"
              />
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
                    ? `Successfully connected! Health latency: ${testResult.latencyMs} ms`
                    : `Connection failed: ${testResult.error}`}
                </span>
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
              <button
                onClick={() => {
                  setCustomApi("http://127.0.0.1:8000");
                  setCustomWs("ws://127.0.0.1:8000/ws");
                }}
                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded border border-slate-800 text-[11px] font-semibold transition-colors"
              >
                Local Dev Preset
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-cyan-500/20"
              >
                Save & Connect
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
