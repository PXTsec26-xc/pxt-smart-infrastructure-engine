import React, { useState } from 'react';
import { Cpu, Server, Database, Radio, Monitor, ArrowRight, Zap, Info, CheckCircle2, XCircle, ZoomIn, ZoomOut, RotateCcw, X, Activity } from 'lucide-react';
import { Device, SystemHealth } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  devices: Device[];
  health: SystemHealth | null;
  onSelectDevice: (deviceId: string) => void;
}

export const Topology: React.FC<Props> = ({ devices, health, onSelectDevice }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const offlineCount = devices.filter(d => d.status === 'OFFLINE').length;
  const degradedCount = devices.filter(d => d.status === 'DEGRADED' || d.status === 'MALFUNCTIONING').length;

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.15, 1.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoomLevel(1.0);

  return (
    <div className="space-y-6 font-mono">
      
      {/* Topology Header Notice & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300 shadow-lg">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>VIRTUAL INFRASTRUCTURE TOPOLOGY MODEL — Process Interconnection Graph</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-cyan-950 text-cyan-400 px-2.5 py-1 rounded border border-cyan-800/60 font-bold shrink-0">
            25 VIRTUAL SIMULATORS CONNECTED
          </span>

          {/* Canvas Zoom Controls */}
          <div className="flex items-center border border-slate-800 rounded-lg bg-slate-950 overflow-hidden">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-[11px] text-slate-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-900 border-l border-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Topology Node Canvas with Scaling */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 lg:p-8 shadow-2xl relative overflow-hidden transition-all duration-200">
        <div
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}
          className="transition-transform duration-200"
        >
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
            
            {/* COLUMN 1: Autonomous Devices */}
            <div className="space-y-3">
              <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" /> 25 IoT Simulators
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-[420px] overflow-y-auto space-y-2 pr-1 text-xs">
                {devices.map((dev) => (
                  <div
                    key={dev.id}
                    onClick={() => {
                      setSelectedNode({
                        name: dev.name,
                        id: dev.id,
                        domain: dev.domain,
                        status: dev.status,
                        type: "Virtual Device Simulator",
                        location: dev.location,
                        uptime: `${dev.uptime}s`,
                        topics: [`pxt/telemetry/${dev.id}`, `pxt/heartbeat/${dev.id}`, `pxt/commands/${dev.id}`],
                        detail: `Autonomous Python simulator executing physical sensor state model for sector ${dev.domain}.`
                      });
                      onSelectDevice(dev.id);
                    }}
                    className={`p-2.5 rounded border cursor-pointer transition-all flex items-center justify-between ${
                      dev.status === 'ONLINE' ? 'bg-slate-950 border-emerald-800/50 hover:border-emerald-500' : 'bg-slate-950 border-red-800/50 hover:border-red-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-200 text-xs">{dev.id}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[110px]">{dev.name}</div>
                    </div>
                    <StatusBadge status={dev.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* ARROW 1 */}
            <div className="hidden lg:flex flex-col items-center justify-center text-cyan-400 text-[10px] space-y-1">
              <span className="font-bold">MQTT v3.1.1</span>
              <div className="w-full h-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 animate-pulse" />
              <ArrowRight className="w-5 h-5 text-teal-400" />
              <span>TCP 1883 / WS 9001</span>
            </div>

            {/* COLUMN 2: MQTT Broker Engine */}
            <div className="flex flex-col items-center">
              <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                <Radio className="w-4 h-4 text-teal-400" /> MQTT Messaging Broker
              </div>
              <div
                onClick={() => setSelectedNode({
                  name: "Embedded Python MQTT Broker (amqtt)",
                  type: "Messaging Middleware",
                  address: "127.0.0.1:1883 (TCP) / 127.0.0.1:9001 (WS)",
                  detail: "Handles high-frequency telemetry ingestion, heartbeat monitoring streams, command acknowledgements, and retained device status payloads."
                })}
                className="bg-slate-900 border border-teal-500/50 hover:border-teal-400 rounded-xl p-6 shadow-lg shadow-teal-500/10 text-center space-y-3 cursor-pointer w-full transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-teal-950 border border-teal-700 mx-auto flex items-center justify-center text-teal-400">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">amqtt Broker</h4>
                  <p className="text-[11px] text-slate-400">127.0.0.1:1883</p>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[10px] text-emerald-400 font-bold">
                  {health?.mqtt_broker_connected ? "● BROKER ONLINE" : "○ DISCONNECTED"}
                </div>
              </div>
            </div>

            {/* ARROW 2 */}
            <div className="hidden lg:flex flex-col items-center justify-center text-teal-400 text-[10px] space-y-1">
              <span className="font-bold">Async Subscriber</span>
              <div className="w-full h-0.5 bg-gradient-to-r from-teal-500 to-blue-500 animate-pulse" />
              <ArrowRight className="w-5 h-5 text-blue-400" />
              <span>Backend Core</span>
            </div>

            {/* COLUMN 3: FastAPI Core & SQLite DB */}
            <div className="space-y-4">
              <div className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-center gap-1.5">
                <Server className="w-4 h-4 text-blue-400" /> Backend Core & Persistence
              </div>
              
              <div
                onClick={() => setSelectedNode({
                  name: "FastAPI Processing Core",
                  type: "Backend Service",
                  address: "127.0.0.1:8000",
                  detail: "Asynchronous backend executing 2s heartbeat watching, backend automation rule evaluations, JWT security, and WebSockets broadcasting."
                })}
                className="bg-slate-900 border border-blue-500/50 hover:border-blue-400 rounded-xl p-4 shadow-lg text-center cursor-pointer transition-all"
              >
                <Server className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <h5 className="font-bold text-slate-100 text-xs">FastAPI Engine</h5>
                <p className="text-[10px] text-slate-400">HTTP 8000 & WS</p>
              </div>

              <div
                onClick={() => setSelectedNode({
                  name: "SQLite Persistence Engine (pxt_iot.db)",
                  type: "Relational Database",
                  address: "Local file: pxt_iot.db",
                  detail: "Stores device registry, telemetry records with (device_id, timestamp) indexing, alerts, events, automation history, commands, users, and audit logs."
                })}
                className="bg-slate-900 border border-purple-500/50 hover:border-purple-400 rounded-xl p-4 shadow-lg text-center cursor-pointer transition-all"
              >
                <Database className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <h5 className="font-bold text-slate-100 text-xs">SQLite DB</h5>
                <p className="text-[10px] text-slate-400">Async SQLAlchemy</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Node Inspection Details Modal */}
      {selectedNode && (
        <div className="bg-slate-900 border border-cyan-500/40 rounded-xl p-5 shadow-2xl text-xs space-y-3 relative">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            aria-label="Close Inspection Modal"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-sm text-cyan-400">{selectedNode.name}</h4>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">{selectedNode.type}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">{selectedNode.detail}</p>
          {selectedNode.topics && (
            <div className="pt-2 border-t border-slate-800/80 font-mono text-[11px] text-slate-400">
              <span className="font-bold text-slate-200">MQTT Topics: </span>
              <span className="text-cyan-400">{selectedNode.topics.join(' | ')}</span>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
