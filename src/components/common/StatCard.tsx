import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
  const colorMap = {
    maroon: {
      bg: 'bg-maroon-50 dark:bg-maroon-950/40',
      icon: 'text-maroon-800 dark:text-gold-400',
      border: 'border-maroon-100 dark:border-maroon-900/60',
      hover: 'hover:border-maroon-300 dark:hover:border-maroon-700',
    },
    gold: {
      bg: 'bg-gold-50 dark:bg-amber-950/40',
      icon: 'text-amber-700 dark:text-gold-300',
      border: 'border-gold-200 dark:border-amber-900/60',
      hover: 'hover:border-gold-400 dark:hover:border-amber-600',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      icon: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-900/60',
      hover: 'hover:border-emerald-300 dark:hover:border-emerald-700',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      icon: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-900/60',
      hover: 'hover:border-blue-300 dark:hover:border-blue-700',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      icon: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-100 dark:border-purple-900/60',
      hover: 'hover:border-purple-300 dark:hover:border-purple-700',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      icon: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-900/60',
      hover: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      icon: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-100 dark:border-rose-900/60',
      hover: 'hover:border-rose-300 dark:hover:border-rose-700',
    },
  };

  const theme = colorMap[color] || colorMap.maroon;

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border ${theme.border} rounded-xl p-4 sm:p-5 shadow-xs transition duration-200 ${
        onClick ? `cursor-pointer ${theme.hover} hover:shadow-card hover:-translate-y-0.5` : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-gray-900 dark:text-white mt-1">
            {value}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.icon} flex-shrink-0 shadow-2xs`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>

      {(change || subtitle) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {change && (
            <span
              className={`inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded ${
                trend === 'up'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : trend === 'down'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300'
              }`}
            >
              {trend === 'up' && <TrendingUp className="w-3 h-3" />}
              {trend === 'down' && <TrendingDown className="w-3 h-3" />}
              {trend === 'neutral' && <Minus className="w-3 h-3" />}
              {change}
            </span>
          )}
          {subtitle && (
            <span className="text-gray-500 dark:text-gray-400 truncate text-[11px]">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
