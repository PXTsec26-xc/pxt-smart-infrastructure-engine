import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  Cpu,
  Network,
  Sliders,
  FileText,
  Server,
  Clock,
  Cpu as HardwareIcon,
  Globe,
  Wifi,
  AlertTriangle,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { SystemHealth, ConnectionState, ConnectionDiagnostics } from '../types';
import { ConnectionSettingsModal } from './ConnectionSettingsModal';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: SystemHealth | null;
  connectionState: ConnectionState;
  diagnostics: ConnectionDiagnostics;
  activeAlertCount: number;
  systemMode?: string;
  onToggleMode?: () => void;
  onReconnect: () => void;
}

export const Navbar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  health,
  connectionState,
  diagnostics,
  activeAlertCount,
  systemMode = "SIMULATION",
  onToggleMode,
  onReconnect
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'devices', label: 'Devices (25)', icon: Cpu },
    { id: 'topology', label: 'Topology', icon: Network },
    { id: 'alerts', label: 'Alerts', icon: ShieldAlert, badge: activeAlertCount },
    { id: 'automation', label: 'Automation', icon: Sliders },
    { id: 'audit', label: 'Audit Trail', icon: FileText },
    { id: 'system', label: 'Health', icon: Server },
  ];

  const renderConnectionPill = () => {
    switch (connectionState) {
      case 'CONNECTED':
        return (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800/80 border border-emerald-800/80 transition-colors text-[11px]"
            title="Telemetry Stream: Connected & Live. Click to inspect or configure endpoints."
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">LIVE (WSS)</span>
          </button>
        );
      case 'DEGRADED':
        return (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/80 transition-colors text-[11px]"
            title="Telemetry Stream: Degraded connection. Click to inspect or configure endpoints."
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 font-bold">DEGRADED</span>
          </button>
        );
      case 'RECONNECTING':
        return (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-700/80 transition-colors text-[11px]"
            title={`Reconnecting attempt ${diagnostics.retryAttempt}/${diagnostics.maxRetries}. Click to configure.`}
          >
            <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            <span className="text-amber-400 font-bold">RETRYING ({diagnostics.retryAttempt}/{diagnostics.maxRetries})</span>
          </button>
        );
      case 'CONNECTING':
        return (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 transition-colors text-[11px]"
            title="Connecting to telemetry engine. Click to inspect."
          >
            <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
            <span className="text-cyan-400 font-bold">CONNECTING</span>
          </button>
        );
      case 'OFFLINE':
      default:
        return (
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-800 transition-colors text-[11px]"
            title="Backend telemetry service is OFFLINE. Click to configure public URL or retry."
          >
            <XCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-400 font-bold">OFFLINE (RETRY)</span>
          </button>
        );
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo & Brand Title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-widest text-slate-100 uppercase">
                    PXT <span className="text-cyan-400">SCADA</span> ENGINE
                  </span>
                  {/* Operating Mode Indicator Badge */}
                  <button
                    onClick={onToggleMode}
                    className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                      systemMode === 'PHYSICAL_HARDWARE'
                        ? 'bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900'
                        : 'bg-cyan-950 text-cyan-400 border-cyan-800 hover:bg-cyan-900'
                    }`}
                    title="Click to toggle between Mode A (Simulation) and Mode B (Physical Hardware)"
                  >
                    <HardwareIcon className="w-3 h-3" />
                    {systemMode === 'PHYSICAL_HARDWARE' ? 'MODE B: PHYSICAL HARDWARE' : 'MODE A: SIMULATION'}
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      isActive
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                    {Boolean(tab.badge) && tab.badge! > 0 && (
                      <span className="bg-red-950 text-red-400 border border-red-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Status Indicators & Clock */}
            <div className="flex items-center gap-3 text-xs">
              <div className="hidden sm:flex items-center gap-1.5 text-slate-400 px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-200">{timeStr || "00:00:00"}</span>
              </div>

              {/* Dynamic Connection Status Pill */}
              {renderConnectionPill()}
            </div>
          </div>
        </div>
      </header>

      {/* Connection Settings & Network Diagnostics Modal */}
      <ConnectionSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        diagnostics={diagnostics}
        onReconnect={onReconnect}
      />
    </>
  );
};
