import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'maroon' | 'gold' | 'emerald' | 'blue' | 'purple' | 'amber' | 'rose';
  subtitle?: string;
  onClick?: () => void;
}

const accents: Record<NonNullable<StatCardProps['color']>, { icon: string; bar: string }> = {
  maroon: { icon: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', bar: 'bg-indigo-500' },
  gold: { icon: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300', bar: 'bg-cyan-500' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', bar: 'bg-emerald-500' },
  blue: { icon: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', bar: 'bg-blue-500' },
  purple: { icon: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', bar: 'bg-violet-500' },
  amber: { icon: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', bar: 'bg-amber-500' },
  rose: { icon: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', bar: 'bg-rose-500' },
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  change,
  trend = 'up',
  color = 'maroon',
  subtitle,
  onClick,
}) => {
  const accent = accents[color];
  return (
    <article
      onClick={onClick}
      onKeyDown={(event) => { if (onClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onClick(); } }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-subtle transition duration-200 dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-card focus-visible:outline-2 focus-visible:outline-indigo-500' : ''}`}
    >
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold leading-none tracking-tight text-slate-950 dark:text-white sm:text-[2rem]">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${accent.icon}`}><Icon className="h-5 w-5" /></span>
      </div>
      {(change || subtitle) && (
        <div className="mt-4 flex min-h-5 flex-wrap items-center gap-2 text-xs">
          {change && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${trend === 'up' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : trend === 'down' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}{change}
          </span>}
          {subtitle && <span className="min-w-0 flex-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{subtitle}</span>}
          {onClick && <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400 transition group-hover:text-indigo-600" />}
        </div>
      )}
    </article>
  );
};
