import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'cyan' | 'emerald' | 'amber' | 'red' | 'blue' | 'purple';
  trend?: string;
  badgeText?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  badgeText
}) => {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      iconBg: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80',
      accent: 'bg-cyan-500',
      text: 'text-cyan-400',
      glow: 'shadow-[0_0_15px_rgba(0,242,255,0.08)]'
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/60',
      iconBg: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
      accent: 'bg-emerald-500',
      text: 'text-emerald-400',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.08)]'
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/60',
      iconBg: 'bg-amber-950/80 text-amber-400 border-amber-800/80',
      accent: 'bg-amber-500',
      text: 'text-amber-400',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.08)]'
    },
    red: {
      border: 'border-red-500/30 hover:border-red-500/60',
      iconBg: 'bg-red-950/80 text-red-400 border-red-800/80',
      accent: 'bg-red-500',
      text: 'text-red-400',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.08)]'
    },
    blue: {
      border: 'border-blue-500/30 hover:border-blue-500/60',
      iconBg: 'bg-blue-950/80 text-blue-400 border-blue-800/80',
      accent: 'bg-blue-500',
      text: 'text-blue-400',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.08)]'
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/60',
      iconBg: 'bg-purple-950/80 text-purple-400 border-purple-800/80',
      accent: 'bg-purple-500',
      text: 'text-purple-400',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.08)]'
    }
  };

  const style = colorMap[color];

  return (
    <div className={`bg-slate-900 border ${style.border} ${style.glow} rounded-xl p-4 transition-all duration-200 relative overflow-hidden flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono tracking-tight text-slate-100 ${style.text}`}>
              {value}
            </span>
            {badgeText && (
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${style.iconBg}`}>
                {badgeText}
              </span>
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg border ${style.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
          {subtitle && <span className="text-slate-400 truncate">{subtitle}</span>}
          {trend && <span className={`font-semibold ${style.text}`}>{trend}</span>}
        </div>
      )}

      {/* Decorative top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${style.accent}`} />
    </div>
  );
};
