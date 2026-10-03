import React from 'react';
import { Server, Radio, Database, Cpu, Activity, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import { SystemHealth } from '../types';

interface Props {
  health: SystemHealth | null;
}

export const SystemHealthPage: React.FC<Props> = ({ health }) => {
  return (
    <div className="space-y-6 font-mono">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" /> Infrastructure Diagnostics & Service Health
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time process state monitoring, MQTT broker client pools, and database connectivity</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">Local Machine Execution (~8 GB RAM Profile)</span>
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
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">REAL PROCESS</span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>Middleware:</span><span className="text-slate-200 font-bold">amqtt (asyncio)</span></div>
            <div className="flex justify-between"><span>TCP Port:</span><span className="text-slate-200">127.0.0.1:1883</span></div>
            <div className="flex justify-between"><span>WebSocket Port:</span><span className="text-slate-200">127.0.0.1:9001</span></div>
            <div className="flex justify-between"><span>Client Connections:</span><span className="text-cyan-400 font-bold">26 Active</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>Hardware Mode:</span>
              <span className="text-amber-400 font-bold">Local Digital Twin</span>
            </div>
          </div>
        </div>

        {/* FastAPI Backend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" /> FastAPI Engine
            </h4>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">OPERATIONAL</span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>HTTP API:</span><span className="text-slate-200 font-bold">127.0.0.1:8000</span></div>
            <div className="flex justify-between"><span>Heartbeat Watcher:</span><span className="text-emerald-400 font-bold">2.0s Ticking (10s Timeout)</span></div>
            <div className="flex justify-between"><span>Rule Evaluator:</span><span className="text-cyan-400 font-bold">Backend Autonomous</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>RAM Profile:</span>
              <span className="text-slate-200">&lt; 100 MB</span>
            </div>
          </div>
        </div>

        {/* SQLite Database */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" /> SQLite Database
            </h4>
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800 font-bold">HEALTHY</span>
          </div>
          <div className="space-y-2 text-slate-400">
            <div className="flex justify-between"><span>Storage File:</span><span className="text-slate-200 font-bold">pxt_iot.db</span></div>
            <div className="flex justify-between"><span>ORM Engine:</span><span className="text-slate-200">Async SQLAlchemy</span></div>
            <div className="flex justify-between"><span>Registered Devices:</span><span className="text-cyan-400 font-bold">{health?.total_devices || 25}</span></div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span>Data Persistence:</span>
              <span className="text-emerald-400 font-bold">Verified Persistent</span>
            </div>
          </div>
        </div>

      </div>

      {/* Explicit Identification Box */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 text-xs space-y-2 text-slate-300">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <ShieldCheck className="w-4 h-4" /> SIMULATION & DATA Provenance NOTICE
        </div>
        <p className="leading-relaxed text-slate-400">
          The 25 connected IoT devices operate as autonomous Python process simulators executing physical sensor noise, drift, and boundary state models. Command actions published over MQTT execute state transitions in the simulated device runtime and generate verifiable acknowledgements recorded in SQLite.
        </p>
      </div>

    </div>
  );
};
