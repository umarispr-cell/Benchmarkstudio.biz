import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DashboardMetricProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; label: string };
  icon?: LucideIcon;
  color?: 'default' | 'brand' | 'warning' | 'error' | 'success';
}

export function DashboardMetric({
  label,
  value,
  subValue,
  trend,
  icon: Icon,
  color = 'default',
}: DashboardMetricProps) {
  const isPositive = trend?.value ? trend.value > 0 : false;
  const isNegative = trend?.value ? trend.value < 0 : false;

  const colorStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-slate-200/60',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
    },
    brand: {
      bg: 'bg-teal-50/50',
      border: 'border-teal-100',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
    },
    warning: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-100',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    error: {
      bg: 'bg-rose-50/50',
      border: 'border-rose-100',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
    },
    success: {
      bg: 'bg-brand-50/50',
      border: 'border-brand-100',
      iconBg: 'bg-brand-100',
      iconColor: 'text-brand-600',
    },
  };

  const currentStyle = colorStyles[color];

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
      className={`${currentStyle.bg} rounded-xl border ${currentStyle.border} p-5 shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${currentStyle.iconBg} ${currentStyle.iconColor}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            isPositive ? 'bg-brand-100 text-brand-700' : 
            isNegative ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNegative ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-slate-500 mt-1">{label}</p>
        {subValue && (
          <p className="text-xs text-slate-400 mt-2 font-medium">{subValue}</p>
        )}
      </div>
    </motion.div>
  );
}
