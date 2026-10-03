import React, { useState, useEffect } from 'react';
import { ArrowLeft, Power, RotateCw, AlertTriangle, CheckCircle, Flame, Send, CheckCheck, Clock, Activity, Gauge } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Device, TelemetryRecord, CommandRecord, SystemEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { fetchTelemetryHistory, fetchCommands, fetchEvents } from '../services/api';

interface Props {
  deviceId: string;
  device: Device | null;
  onBack: () => void;
  onSendCommand: (deviceId: string, action: string, params?: any) => void;
}

export const DeviceDetail: React.FC<Props> = ({ deviceId, device, onBack, onSendCommand }) => {
  const [history, setHistory] = useState<TelemetryRecord[]>([]);
  const [commands, setCommands] = useState<CommandRecord[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('ALL');
  const [anomalyVal, setAnomalyVal] = useState('98.5');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [deviceId]);

  const loadData = async () => {
    try {
      const [hData, cData, eData] = await Promise.all([
        fetchTelemetryHistory(deviceId),
        fetchCommands(deviceId),
        fetchEvents(deviceId)
      ]);
      setHistory(hData);
      setCommands(cData);
      setEvents(eData);
    } catch (err) {
      console.error("Error loading device detail data:", err);
    }
  };

  if (!device) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        Loading device parameters for {deviceId}...
      </div>
    );
  }

  const metrics = Array.from(new Set(history.map(h => h.metric_name)));

  const filteredHistory = selectedMetric === 'ALL' ? history : history.filter(h => h.metric_name === selectedMetric);

  const chartData = filteredHistory.map(item => ({
    time: new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    value: item.value,
    metric: item.metric_name,
    unit: item.unit
  }));

  // Latest value per metric for gauges
  const latestByMetric: Record<string, TelemetryRecord> = {};
  history.forEach(h => {
    if (!latestByMetric[h.metric_name] || h.timestamp > latestByMetric[h.metric_name].timestamp) {
      latestByMetric[h.metric_name] = h;
    }
  });

  return (
    <div className="space-y-6 font-mono">
      
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-slate-700 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Device Inventory
        </button>
        <StatusBadge status={device.status} size="lg" />
      </div>

      {/* Main Info Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-widest">{device.domain}</span>
            <h2 className="text-2xl font-black text-slate-100 mt-1">{device.name}</h2>
            <p className="text-xs text-slate-400 mt-1">
              ID: <span className="text-slate-200">{device.id}</span> | Location: <span className="text-slate-200">{device.location}</span> | Type: <span className="text-slate-200">{device.device_type}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => onSendCommand(device.id, "set_power", { state: device.is_powered_on ? "OFF" : "ON" })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                device.is_powered_on ? 'bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
              }`}
            >
              <Power className="w-4 h-4" /> {device.is_powered_on ? "Power OFF" : "Power ON"}
            </button>

            <button
              onClick={() => onSendCommand(device.id, "restart")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <RotateCw className="w-4 h-4" /> Restart
            </button>

            <button
              onClick={() => onSendCommand(device.id, "simulate_failure")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <AlertTriangle className="w-4 h-4" /> Inject Failure
            </button>

            <button
              onClick={() => onSendCommand(device.id, "simulate_recovery")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            >
              <CheckCircle className="w-4 h-4" /> Recover
            </button>
          </div>
        </div>
      </div>

      {/* Live Sensor Metric Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.values(latestByMetric).map((metric) => (
          <div key={metric.metric_name} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="uppercase tracking-wider font-semibold">{metric.metric_name}</span>
              <Gauge className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-slate-100">{metric.value} <span className="text-xs font-normal text-slate-400">{metric.unit}</span></div>
            <div className="text-[10px] text-slate-500 pt-1">Updated {new Date(metric.timestamp * 1000).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Timeseries Chart & ACK Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts Historical Timeseries (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" /> Telemetry Timeseries Chart
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filter Metric:</span>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ALL">ALL METRICS</option>
                  {metrics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            {chartData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-slate-500 text-xs">
                Awaiting historical telemetry records from SQLite database...
              </div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc" }} />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#00f2ff" strokeWidth={2} dot={false} name={selectedMetric !== 'ALL' ? selectedMetric : 'Metric Reading'} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Anomaly & Parameter Control Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" /> Sensor Calibration & Anomaly Control
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400">Metric:</span>
              <select
                id="anomalyMetricSelect"
                className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {metrics.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <span className="text-slate-400">Value:</span>
              <input
                type="number"
                value={anomalyVal}
                onChange={(e) => setAnomalyVal(e.target.value)}
                className="w-24 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
              />

              <button
                onClick={() => {
                  const sel = (document.getElementById("anomalyMetricSelect") as HTMLSelectElement)?.value;
                  if (sel) {
                    onSendCommand(device.id, "trigger_anomaly", { sensor: sel, value: parseFloat(anomalyVal) });
                  }
                }}
                className="px-3 py-1.5 rounded bg-amber-950 border border-amber-800 text-amber-300 hover:bg-amber-900 transition-colors font-bold flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <Send className="w-3.5 h-3.5" /> Inject Anomaly
              </button>

              <button
                onClick={() => onSendCommand(device.id, "clear_anomaly")}
                className="px-3 py-1.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Clear Overrides
              </button>
            </div>
          </div>
        </div>

        {/* Command Console & ACK History (1 Column) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg text-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <CheckCheck className="w-4 h-4 text-emerald-400" /> Command ACK Console
            </h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {commands.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No control commands issued to this device yet.
                </div>
              ) : (
                commands.map((cmd) => (
                  <div key={cmd.id} className="p-3 rounded bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-400">{cmd.action}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        cmd.status === 'ACKNOWLEDGED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        {cmd.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{cmd.message || "Execution confirmed"}</p>
                    <p className="text-[10px] text-slate-500">{new Date(cmd.requested_at * 1000).toLocaleTimeString()}</p>
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
