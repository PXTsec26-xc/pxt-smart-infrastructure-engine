import React, { useState, useEffect } from 'react';
import { Sliders, Plus, ToggleLeft, ToggleRight, CheckCircle2, History } from 'lucide-react';
import { AutomationRule, AutomationHistory } from '../types';
import { fetchAutomationRules, toggleAutomationRule, fetchAutomationHistory } from '../services/api';

export const AutomationPage: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [history, setHistory] = useState<AutomationHistory[]>([]);

  useEffect(() => {
    loadRulesAndHistory();
    const interval = setInterval(loadRulesAndHistory, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadRulesAndHistory = async () => {
    try {
      const [rData, hData] = await Promise.all([
        fetchAutomationRules(),
        fetchAutomationHistory()
      ]);
      setRules(rData);
      setHistory(hData);
    } catch (err) {
      console.error("Error loading automation data:", err);
    }
  };

  const handleToggle = async (ruleId: number) => {
    await toggleAutomationRule(ruleId);
    loadRulesAndHistory();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between font-mono">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" /> Backend Automation Rule Engine
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Rules execute autonomously on the backend server independent of active UI sessions</p>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-100">{rule.name}</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">{rule.description}</p>
              </div>
              <button
                onClick={() => handleToggle(rule.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold border transition-colors ${
                  rule.enabled ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {rule.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {rule.enabled ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1 text-slate-300">
              <div>Target Device: <span className="text-cyan-400 font-bold">{rule.target_device}</span></div>
              <div>Condition: <span className="text-amber-400 font-bold">{rule.metric_name} {rule.operator} {rule.threshold_val}</span></div>
              <div>Action: <span className="text-emerald-400 font-bold">{rule.action_type}</span></div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
              <span>Triggers Executed: <strong className="text-slate-200">{rule.trigger_count || 0}</strong></span>
              <span>Last Fired: <strong className="text-slate-200">{rule.last_triggered ? new Date(rule.last_triggered * 1000).toLocaleTimeString() : 'Never'}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {/* Execution History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-xs">
        <h4 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" /> Automation Execution History Log
        </h4>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {history.length === 0 ? (
            <div className="text-center py-6 text-slate-500">No automation executions recorded yet.</div>
          ) : (
            history.map((h) => (
              <div key={h.id} className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-cyan-400">{h.rule_name}</span>
                  <p className="text-[11px] text-slate-300 mt-0.5">{h.result_message}</p>
                </div>
                <span className="text-[10px] text-slate-500">{new Date(h.timestamp * 1000).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
