import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, AlertOctagon, RefreshCw, Wrench } from 'lucide-react';
import { DeviceStatus } from '../types';

interface Props {
  status: DeviceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const upperStatus = status.toUpperCase();

  let config = {
    bg: "bg-slate-800 text-slate-300 border-slate-700",
    icon: CheckCircle2,
    iconColor: "text-slate-400",
    text: upperStatus
  };

  switch (upperStatus) {
    case 'ONLINE':
      config = {
        bg: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
        icon: CheckCircle2,
        iconColor: "text-emerald-400",
        text: "ONLINE"
      };
      break;
    case 'OFFLINE':
      config = {
        bg: "bg-red-950/80 text-red-300 border-red-800/80",
        icon: XCircle,
        iconColor: "text-red-400",
        text: "OFFLINE"
      };
      break;
    case 'DEGRADED':
      config = {
        bg: "bg-amber-950/80 text-amber-300 border-amber-800/80",
        icon: AlertTriangle,
        iconColor: "text-amber-400",
        text: "DEGRADED"
      };
      break;
    case 'MALFUNCTIONING':
      config = {
        bg: "bg-rose-950/90 text-rose-200 border-rose-800",
        icon: AlertOctagon,
        iconColor: "text-rose-400 animate-pulse",
        text: "MALFUNCTION"
      };
      break;
    case 'STARTING':
      config = {
        bg: "bg-cyan-950/80 text-cyan-300 border-cyan-800/80",
        icon: RefreshCw,
        iconColor: "text-cyan-400 animate-spin",
        text: "STARTING"
      };
      break;
    case 'MAINTENANCE':
      config = {
        bg: "bg-blue-950/80 text-blue-300 border-blue-800/80",
        icon: Wrench,
        iconColor: "text-blue-400",
        text: "MAINTENANCE"
      };
      break;
  }

  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1 font-semibold",
    md: "px-2.5 py-1 text-xs gap-1.5 font-bold",
    lg: "px-3 py-1.5 text-xs gap-2 font-black"
  };

  return (
    <span className={`inline-flex items-center rounded-md border ${config.bg} ${sizeClasses[size]} uppercase tracking-wider font-mono shadow-sm`}>
      <Icon className={`w-3.5 h-3.5 ${config.iconColor} shrink-0`} />
      <span>{config.text}</span>
    </span>
  );
};
