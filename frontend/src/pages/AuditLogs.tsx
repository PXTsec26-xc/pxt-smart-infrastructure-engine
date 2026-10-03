import React, { useState, useEffect } from 'react';
import { FileText, Shield, UserCheck } from 'lucide-react';
import { fetchAuditLogs } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchAuditLogs().then(setLogs).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between font-mono">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Security & System Audit Trail
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Immutable record of administrative actions, user logins, and device commands</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg font-mono text-xs">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-400 uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Action</th>
              <th className="p-3.5">Resource</th>
              <th className="p-3.5">Details</th>
              <th className="p-3.5">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No audit records recorded yet.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 text-cyan-400 font-bold">{log.username}</td>
                  <td className="p-3.5 text-emerald-400 font-bold">{log.action}</td>
                  <td className="p-3.5 text-slate-200">{log.resource}</td>
                  <td className="p-3.5 text-slate-400 max-w-sm truncate">{log.details}</td>
                  <td className="p-3.5 text-slate-500">{new Date(log.timestamp * 1000).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
