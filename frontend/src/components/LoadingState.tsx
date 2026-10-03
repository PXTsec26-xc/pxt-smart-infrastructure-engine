import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  height?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = "Loading telemetric data...", height = "h-48" }) => {
  return (
    <div className={`w-full ${height} bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col items-center justify-center font-mono text-xs text-slate-400 gap-3`}>
      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
      <span>{message}</span>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ElementType;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon: Icon = AlertCircle
}) => {
  return (
    <div className="w-full p-8 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-col items-center justify-center text-center font-mono space-y-3">
      <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-full text-slate-400">
        <Icon className="w-6 h-6" />
      </div>
      <div className="max-w-md">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wide">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-cyan-400 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
