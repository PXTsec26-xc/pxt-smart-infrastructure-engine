import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, Filter, AlertTriangle, CheckCheck, Clock } from 'lucide-react';
import { Alert, AlertSummary } from '../types';

interface Props {
  alerts: Alert[];
  alertSummary: AlertSummary | null;
  onAcknowledgeAlert: (alertId: number) => void;
  onResolveAlert: (alertId: number) => void;
}

export const AlertsPage: React.FC<Props> = ({ alerts, alertSummary, onAcknowledgeAlert, onResolveAlert }) => {
  const [tab, setTab] = useState<'ACTIVE' | 'ACK' | 'RESOLVED'>('ACTIVE');
  const [filterSeverity, setFilterSeverity] = useState('ALL');

  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'ALL' || a.severity === filterSeverity;
    if (tab === 'ACTIVE') return matchSev && !a.acknowledged && !a.resolved;
    if (tab === 'ACK') return matchSev && a.acknowledged && !a.resolved;
    return matchSev && a.resolved;
  });

  return (
    <div className="space-y-6 font-mono">
      
      {/* Incident Console Summary Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Enterprise Incident Console</h3>
            <p className="text-slate-400 text-[11px] mt-0.5">Differentiating Active Incidents, Acknowledged Alerts, and Resolved Events</p>
          </div>
        </div>

        {/* Tab Badges */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setTab('ACTIVE')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              tab === 'ACTIVE' ? 'bg-red-950 text-red-400 border border-red-800 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ACTIVE UNACK ({alertSummary?.active_unresolved || alerts.filter(a => !a.acknowledged && !a.resolved).length})
          </button>

          <button
            onClick={() => setTab('ACK')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              tab === 'ACK' ? 'bg-amber-950 text-amber-400 border border-amber-800 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ACKNOWLEDGED ({alertSummary?.acknowledged || alerts.filter(a => a.acknowledged && !a.resolved).length})
          </button>

          <button
            onClick={() => setTab('RESOLVED')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${
              tab === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RESOLVED ({alertSummary?.resolved || alerts.filter(a => a.resolved).length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-4 h-4 text-cyan-400" />
          <span>Filter Severity:</span>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="CRITICAL">CRITICAL ONLY</option>
            <option value="WARNING">WARNING ONLY</option>
            <option value="INFO">INFO ONLY</option>
          </select>
        </div>
        <span className="text-slate-400">{filteredAlerts.length} incidents displayed</span>
      </div>

      {/* Incident List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Severity</th>
              <th className="p-3.5">Device ID</th>
              <th className="p-3.5">Title</th>
              <th className="p-3.5">Description</th>
              <th className="p-3.5">Created At</th>
              <th className="p-3.5 text-right">Operator Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredAlerts.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No incidents match the selected tab or severity filter.
                </td>
              </tr>
            ) : (
              filteredAlerts.map((alt) => (
                <tr key={alt.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                      alt.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-800' :
                      alt.severity === 'WARNING' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {alt.severity}
                    </span>
                  </td>
                  <td className="p-3.5 text-cyan-400 font-bold">{alt.device_id}</td>
                  <td className="p-3.5 text-slate-200 font-bold">{alt.title}</td>
                  <td className="p-3.5 text-slate-400 max-w-xs truncate">{alt.description}</td>
                  <td className="p-3.5 text-slate-400">{new Date(alt.created_at * 1000).toLocaleTimeString()}</td>
                  <td className="p-3.5 text-right space-x-2">
                    {!alt.acknowledged && !alt.resolved && (
                      <button
                        onClick={() => onAcknowledgeAlert(alt.id)}
                        className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                      >
                        ACKNOWLEDGE
                      </button>
                    )}
                    {!alt.resolved && (
                      <button
                        onClick={() => onResolveAlert(alt.id)}
                        className="px-3 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        RESOLVE
                      </button>
                    )}
                    {alt.resolved && (
                      <span className="text-slate-500 font-bold flex items-center justify-end gap-1">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> RESOLVED
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
