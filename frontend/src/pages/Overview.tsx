import React from 'react';
import { Cpu, Activity, ShieldAlert, Zap, Server, CheckCircle2, AlertTriangle, Radio, Flame, ArrowUpRight, Wifi, RefreshCw, XCircle } from 'lucide-react';
import { Device, Alert, AlertSummary, SystemHealth, TelemetryRecord, SystemEvent, ConnectionState, ConnectionDiagnostics } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { MetricCard } from '../components/MetricCard';

interface Props {
  devices: Device[];
  alerts: Alert[];
  alertSummary: AlertSummary | null;
  health: SystemHealth | null;
  telemetry: TelemetryRecord[];
  events: SystemEvent[];
  connectionState?: ConnectionState;
  diagnostics?: ConnectionDiagnostics;
  onSelectDevice: (deviceId: string) => void;
  onAcknowledgeAlert: (alertId: number) => void;
  onRetryConnection?: () => void;
}

export const Overview: React.FC<Props> = ({
  devices,
  alerts,
  alertSummary,
  health,
  telemetry,
  events,
  connectionState = 'CONNECTED',
  diagnostics,
  onSelectDevice,
  onAcknowledgeAlert,
  onRetryConnection
}) => {
  const totalCount = devices.length || (health?.total_devices ?? 25);
  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.filter(d => d.status === 'OFFLINE').length;
  const degradedCount = devices.filter(d => d.status === 'DEGRADED' || d.status === 'MALFUNCTIONING').length;
  const availabilityPct = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;

  const activeIncidentsCount = alertSummary ? alertSummary.active_unresolved : alerts.filter(a => !a.acknowledged && !a.resolved).length;

  const domains = Array.from(new Set(devices.map(d => d.domain)));

  // Latest telemetry group by metric for summary preview
  const recentTelem = telemetry.slice(0, 6);

  // Dynamic broker info
  const brokerHost = health?.broker_host || "MQTT Ingestion Engine";
  const brokerPort = health?.broker_port || 1883;
  const isBrokerOnline = health?.mqtt_broker_connected ?? false;

  // Approximate throughput based on active nodes
  const throughputRate = onlineCount > 0 ? (onlineCount * 0.5).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      
      {/* Offline Alert Banner if Disconnected */}
      {connectionState === 'OFFLINE' && (
        <div className="bg-red-950/80 border border-red-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-red-200 shadow-xl">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <span className="font-bold uppercase tracking-wider text-red-100">TELEMETRY SERVICE UNREACHABLE (OFFLINE)</span>
              <p className="text-[11px] text-red-300/80 mt-0.5">
                The frontend cannot connect to backend at <span className="underline font-mono">{diagnostics?.apiBase}</span>. Ensure the backend service is deployed and running.
              </p>
            </div>
          </div>
          {onRetryConnection && (
            <button
              onClick={onRetryConnection}
              className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg font-bold border border-red-700 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          )}
        </div>
      )}

      {/* Infrastructure System Operational Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shrink-0 ${
            connectionState === 'CONNECTED'
              ? 'bg-emerald-400 animate-pulse'
              : connectionState === 'DEGRADED' || connectionState === 'RECONNECTING'
              ? 'bg-amber-400 animate-pulse'
              : 'bg-red-500'
          }`} />
          <div>
            <span className="font-bold text-slate-100 uppercase tracking-wider">
              PXT IoT ENGINE STATUS: {connectionState === 'CONNECTED' ? 'OPERATIONAL' : connectionState}
            </span>
            <span className="text-slate-400 ml-2 hidden sm:inline">
              | Real-Time SCADA Digital Twin Telemetry Pipeline
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Engine Throughput: <strong className="text-cyan-400">{throughputRate} msg/s</strong></span>
          <span>
            Broker: <strong className={isBrokerOnline ? "text-emerald-400" : "text-red-400"}>
              {isBrokerOnline ? "ONLINE" : "DISCONNECTED"}
            </strong>
          </span>
        </div>
      </div>

      {/* 6 High-Density KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <MetricCard
          title="Total Devices"
          value={totalCount}
          subtitle="Registered Nodes"
          icon={Cpu}
          color="cyan"
          badgeText={`${totalCount} ACTIVE`}
        />

        <MetricCard
          title="Availability"
          value={`${availabilityPct}%`}
          subtitle="Infrastructure SLA"
          icon={Activity}
          color="emerald"
          trend={onlineCount > 0 ? "ONLINE" : "OFFLINE"}
        />

        <MetricCard
          title="Online Nodes"
          value={onlineCount}
          subtitle="Active Telemetry"
          icon={CheckCircle2}
          color="emerald"
          badgeText={`${onlineCount}/${totalCount}`}
        />

        <MetricCard
          title="Offline Nodes"
          value={offlineCount}
          subtitle="Heartbeat Missed"
          icon={Server}
          color={offlineCount > 0 ? "red" : "blue"}
          badgeText={offlineCount > 0 ? "ATTENTION" : "STABLE"}
        />

        <MetricCard
          title="Degraded"
          value={degradedCount}
          subtitle="Anomaly Injected"
          icon={AlertTriangle}
          color={degradedCount > 0 ? "amber" : "blue"}
          badgeText={degradedCount > 0 ? "INSPECT" : "NORMAL"}
        />

        <MetricCard
          title="Active Incidents"
          value={activeIncidentsCount}
          subtitle="Unacknowledged"
          icon={ShieldAlert}
          color={activeIncidentsCount > 0 ? "red" : "emerald"}
          badgeText={activeIncidentsCount > 0 ? "UNACK" : "CLEAR"}
        />
      </div>

      {/* Main Grid: Sector Distribution & Live Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Industrial Sectors Breakdown & Telemetry Overview */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Domain Sectors Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between font-mono">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <Zap className="w-4 h-4 text-cyan-400" /> Industrial Sector Health
              </h3>
              <span className="text-xs text-slate-400">{domains.length || 5} Autonomous Domains</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {domains.length === 0 ? (
                <div className="col-span-2 p-6 bg-slate-950 border border-slate-800 rounded-lg text-center text-slate-500 font-mono text-xs">
                  Awaiting device inventory stream from backend...
                </div>
              ) : (
                domains.map((dom) => {
                  const domDevices = devices.filter(d => d.domain === dom);
                  const domOnline = domDevices.filter(d => d.status === 'ONLINE').length;
                  const domPct = Math.round((domOnline / (domDevices.length || 1)) * 100);

                  return (
                    <div key={dom} className="bg-slate-950 border border-slate-800/80 rounded-lg p-3.5 space-y-2.5 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{dom}</span>
                        <span className="text-[11px] font-bold text-cyan-400">{domOnline}/{domDevices.length} ONLINE ({domPct}%)</span>
                      </div>

                      {/* Progress Health Bar */}
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${domPct === 100 ? 'bg-emerald-400' : domPct >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                          style={{ width: `${domPct}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-1 pt-1">
                        {domDevices.slice(0, 3).map((dev) => (
                          <div
                            key={dev.id}
                            onClick={() => onSelectDevice(dev.id)}
                            className="flex items-center justify-between p-1.5 rounded bg-slate-900/60 hover:bg-slate-800/80 cursor-pointer text-[11px] transition-colors"
                          >
                            <span className="truncate max-w-[150px] text-slate-300">{dev.name}</span>
                            <StatusBadge status={dev.status} size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Real-time Telemetry Overview Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <Radio className="w-4 h-4 text-teal-400" /> Real-Time Telemetry Feed
              </h3>
              <span className="text-xs text-slate-400">Live Ingested Readings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentTelem.length === 0 ? (
                <div className="col-span-3 p-6 bg-slate-950 border border-slate-800 rounded-lg text-center text-slate-500 text-xs font-mono">
                  Connecting to live telemetry broadcast stream...
                </div>
              ) : (
                recentTelem.map((t, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="text-cyan-400 font-bold">{t.device_id}</span>
                      <span>{new Date(t.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-100">{t.metric_name}</div>
                    <div className="text-base font-black text-emerald-400">{t.value} <span className="text-xs font-normal text-slate-400">{t.unit}</span></div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Active Incident Console & Event Timeline */}
        <div className="space-y-6">
          
          {/* Active Incidents Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-red-400" /> Critical Incidents ({activeIncidentsCount})
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {alerts.filter(a => !a.acknowledged && !a.resolved).length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto" />
                  <p className="font-bold text-slate-300">ZERO ACTIVE INCIDENTS</p>
                  <p className="text-[11px]">All infrastructure sensors within physical operating thresholds.</p>
                </div>
              ) : (
                alerts.filter(a => !a.acknowledged && !a.resolved).slice(0, 6).map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-red-950/40 border-red-800/80 text-red-300'
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold tracking-wide uppercase">{alt.severity}</span>
                      <button
                        onClick={() => onAcknowledgeAlert(alt.id)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-600 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        ACKNOWLEDGE
                      </button>
                    </div>
                    <p className="font-bold text-slate-100">{alt.title}</p>
                    <p className="text-[11px] text-slate-400 leading-tight">{alt.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Events Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg font-mono space-y-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-cyan-400" /> Recent System Events
            </h3>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1 text-xs">
              {events.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-slate-950 rounded border border-slate-800/80 text-xs">
                  No recent events recorded.
                </div>
              ) : (
                events.slice(0, 6).map((ev) => (
                  <div key={ev.id} className="p-2.5 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="text-cyan-400 font-bold">{ev.device_id}</span>
                      <span>{new Date(ev.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300">{ev.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
