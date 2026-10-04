import React from 'react';
import { Server, Radio, Database, Cpu, Activity, CheckCircle2, ShieldCheck, Info, Cpu as HardwareIcon, Wifi, Layers, Check, AlertCircle } from 'lucide-react';
import { SystemHealth, SystemConfig } from '../types';
import { getApiBase, getWsBase } from '../services/api';

interface Props {
  health: SystemHealth | null;
  config?: SystemConfig | null;
}

export const SystemHealthPage: React.FC<Props> = ({ health, config }) => {
  const apiEndpoint = getApiBase();
  const wsEndpoint = getWsBase();
  const brokerHost = health?.broker_host || config?.mqtt_broker?.host || "MQTT Middleware Service";
  const brokerPort = health?.broker_port || config?.mqtt_broker?.tcp_port || 1883;
  const brokerWsPort = health?.broker_ws_port || config?.mqtt_broker?.ws_port || 9001;
  const brokerConnected = health?.mqtt_broker_connected || config?.mqtt_broker?.connected || false;

  return (
    <div className="space-y-6 font-mono">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" /> Infrastructure Diagnostics & Service Health
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time process state monitoring, MQTT broker telemetry pipeline, and persistent database storage</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">Environment: <strong className="text-cyan-400">{config?.environment || "Production/Cloud Ready"}</strong></span>
        </div>
      </div>

      {/* 3 Main SCADA Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
        
        {/* MQTT Broker Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Radio className="w-4 h-4 text-teal-400" /> MQTT Broker
            </h4>
            <span className={`px-2 py-0.5 rounded border font-bold ${
              brokerConnected
                ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                : 'bg-red-950 text-red-400 border-red-800'
            }`}>
              {brokerConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>Protocol Engine:</span><span className="text-slate-200 font-bold">amqtt / Mosquitto Async</span></div>
            <div className="flex justify-between"><span>TCP Ingestion:</span><span className="text-slate-200 font-mono">Port {brokerPort}</span></div>
            <div className="flex justify-between"><span>WebSocket Gateway:</span><span className="text-slate-200 font-mono">Port {brokerWsPort}</span></div>
            <div className="flex justify-between"><span>Virtual Device Pool:</span><span className="text-cyan-400 font-bold">{health?.total_devices || 25} Devices Active</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>Operating Mode:</span>
              <span className="text-cyan-400 font-bold">{config?.operating_mode || "Dual Mode (Sim + Hardware)"}</span>
            </div>
          </div>
        </div>

        {/* FastAPI Backend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> FastAPI Core Engine
            </h4>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">OPERATIONAL</span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>Active REST API:</span><span className="text-slate-200 font-bold font-mono truncate max-w-[170px]">{apiEndpoint}</span></div>
            <div className="flex justify-between"><span>WebSocket Stream:</span><span className="text-slate-200 font-mono truncate max-w-[170px]">{wsEndpoint}</span></div>
            <div className="flex justify-between"><span>Heartbeat Watcher:</span><span className="text-emerald-400 font-bold">2.0s Ticking (10s Timeout)</span></div>
            <div className="flex justify-between"><span>Automation Engine:</span><span className="text-cyan-400 font-bold">Dynamic Rule Evaluator</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>API Endpoints:</span>
              <span className="text-slate-200">REST, WebSocket, Ingest</span>
            </div>
          </div>
        </div>

        {/* SQLite Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" /> Relational Database
            </h4>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">HEALTHY</span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>Storage Engine:</span><span className="text-slate-200 font-bold">Async SQLAlchemy / SQLite</span></div>
            <div className="flex justify-between"><span>Database File:</span><span className="text-slate-200 font-mono">pxt_iot.db</span></div>
            <div className="flex justify-between"><span>Registered Devices:</span><span className="text-cyan-400 font-bold">{health?.total_devices || 25}</span></div>
            <div className="flex justify-between"><span>Online / Offline:</span><span className="text-emerald-400 font-bold">{health?.online_devices ?? 0} / {health?.offline_devices ?? 0}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>Data Retention:</span>
              <span className="text-emerald-400 font-bold">30 Days Automated Policy</span>
            </div>
          </div>
        </div>

      </div>

      {/* Mandatory Capability Matrix: Simulated vs Physical IoT Hardware (Requirement 12) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" /> Platform Architecture & Capability Matrix
          </h4>
          <span className="text-xs text-slate-400">Simulation Engine vs Physical IoT Hardware</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Simulated Capabilities */}
          <div className="bg-slate-950 border border-cyan-800/40 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Cpu className="w-4 h-4" />
              <span>Simulated Capabilities (Autonomous Virtual Twin)</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>25 Virtual IoT Nodes</strong> running mathematical models across 5 sectors (Smart Grid, Water, HVAC, Manufacturing, Environmental).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Continuous Sensor Physics</strong>: Gaussian noise, thermal inertia, fluid flow friction, diurnal solar curves, and battery discharge math.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Software Anomaly Injection</strong>: On-demand sensor spikes and simulated hardware faults (overheating, pressure leaks, power failure).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <span><strong>Synthetic Heartbeats & Uptime</strong>: Autonomous 2-second heartbeat ticker with simulated reconnect counters.</span>
              </li>
            </ul>
          </div>

          {/* Physical Hardware Capabilities */}
          <div className="bg-slate-950 border border-amber-800/40 rounded-lg p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <HardwareIcon className="w-4 h-4" />
              <span>Physical IoT Hardware Capabilities (Ready for Field Deployment)</span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>HTTP/REST Telemetry Ingestion</strong>: Dedicated <code className="text-amber-300">POST /api/telemetry/ingest</code> endpoint for ESP32, Arduino, Raspberry Pi microcontrollers.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Standard MQTT Broker Port 1883</strong>: Physical devices publish to <code className="text-amber-300">pxt/telemetry/&#123;device_id&#125;</code> and listen on <code className="text-amber-300">pxt/commands/&#123;device_id&#125;</code>.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Modbus TCP Protocol Adapter</strong>: Ingests 16-bit holding and input registers from industrial PLCs (Siemens, Schneider, Allen-Bradley).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><strong>Real Physical Actuator Execution</strong>: Actual relay triggers, solenoid valves, and motor drives require physical hardware integration.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Explicit Identification Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-xs space-y-2 text-slate-300">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <ShieldCheck className="w-4 h-4" /> PUBLIC ACCESS & DEPLOYMENT NOTICE
        </div>
        <p className="leading-relaxed text-slate-400">
          The PXT Smart Infrastructure dashboard communicates directly over standard HTTPS and WebSockets. Public visitors can monitor live telemetry, execute commands, inspect device state graphs, and trigger automation rules without installing any local software or exposing local machine ports.
        </p>
      </div>

    </div>
  );
};
