import React, { useState } from 'react';
import { Search, Filter, Power, RotateCw, AlertTriangle, CheckCircle, Flame, Eye, LayoutGrid, List, ArrowUpDown } from 'lucide-react';
import { Device } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  devices: Device[];
  onSelectDevice: (deviceId: string) => void;
  onSendCommand: (deviceId: string, action: string, params?: any) => void;
}

export const DeviceList: React.FC<Props> = ({ devices, onSelectDevice, onSendCommand }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'domain' | 'status'>('id');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const domains = ['ALL', ...Array.from(new Set(devices.map(d => d.domain)))];
  const statuses = ['ALL', 'ONLINE', 'OFFLINE', 'DEGRADED', 'MALFUNCTIONING'];

  const filteredDevices = devices
    .filter(dev => {
      const matchesSearch = dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            dev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            dev.device_type.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDomain = selectedDomain === 'ALL' || dev.domain === selectedDomain;
      const matchesStatus = selectedStatus === 'ALL' || dev.status === selectedStatus;
      return matchesSearch && matchesDomain && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'domain') return a.domain.localeCompare(b.domain);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.id.localeCompare(b.id);
    });

  return (
    <div className="space-y-6">
      
      {/* Search, Filter, Sort & View Mode Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-lg">
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by ID, name or device type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Sector:</span>
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="domain">Domain</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div className="flex items-center border border-slate-800 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-950 text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 transition-colors ${viewMode === 'table' ? 'bg-slate-800 text-cyan-400' : 'bg-slate-950 text-slate-400'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Grid View Mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((dev) => (
            <div key={dev.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase tracking-wider">{dev.domain}</span>
                    <h4 className="text-base font-bold text-slate-100 font-mono mt-0.5">{dev.name}</h4>
                    <p className="text-xs font-mono text-slate-400">{dev.id}</p>
                  </div>
                  <StatusBadge status={dev.status} size="sm" />
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 font-mono text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-slate-200">{dev.device_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="text-slate-200 truncate max-w-[160px]">{dev.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Heartbeat:</span>
                    <span className="text-slate-200">{dev.last_seen > 0 ? `${Math.round(Date.now()/1000 - dev.last_seen)}s ago` : 'Never'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 font-mono text-xs">
                <button
                  onClick={() => onSelectDevice(dev.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <Eye className="w-3.5 h-3.5" /> Inspect Node
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onSendCommand(dev.id, "set_power", { state: dev.is_powered_on ? "OFF" : "ON" })}
                    className={`p-1.5 rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                      dev.is_powered_on ? 'bg-red-950/80 text-red-300 border-red-800 hover:bg-red-900' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                    }`}
                    title={dev.is_powered_on ? "Power OFF" : "Power ON"}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSendCommand(dev.id, "restart")}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                    title="Restart Node"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {dev.status === 'ONLINE' ? (
                    <button
                      onClick={() => onSendCommand(dev.id, "simulate_failure")}
                      className="p-1.5 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      title="Inject Failure"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onSendCommand(dev.id, "simulate_recovery")}
                      className="p-1.5 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      title="Recover Node"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View Mode */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Device ID</th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Heartbeat</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDevices.map((dev) => (
                <tr key={dev.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5 text-cyan-400 font-bold">{dev.id}</td>
                  <td className="p-3.5 text-slate-200 font-bold">{dev.name}</td>
                  <td className="p-3.5 text-slate-400">{dev.domain}</td>
                  <td className="p-3.5 text-slate-400">{dev.device_type}</td>
                  <td className="p-3.5"><StatusBadge status={dev.status} size="sm" /></td>
                  <td className="p-3.5 text-slate-400">{dev.last_seen > 0 ? `${Math.round(Date.now()/1000 - dev.last_seen)}s ago` : 'Never'}</td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => onSelectDevice(dev.id)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
