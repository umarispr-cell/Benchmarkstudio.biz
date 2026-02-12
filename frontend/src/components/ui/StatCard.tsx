import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  color?: 'teal' | 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate' | 'cyan';
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

const colorMap = {
  teal:   { bg: 'bg-teal-50',   text: 'text-teal-600',   icon: 'bg-teal-100 text-teal-600',   ring: 'ring-teal-500/10' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'bg-blue-100 text-blue-600',   ring: 'ring-blue-500/10' },
  green:  { bg: 'bg-emerald-50',text: 'text-emerald-600', icon: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-500/10' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  icon: 'bg-amber-100 text-amber-600', ring: 'ring-amber-500/10' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   icon: 'bg-rose-100 text-rose-600',   ring: 'ring-rose-500/10' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', icon: 'bg-violet-100 text-violet-600', ring: 'ring-violet-500/10' },
  slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'bg-slate-100 text-slate-600',  ring: 'ring-slate-500/10' },
  cyan:   { bg: 'bg-cyan-50',   text: 'text-cyan-600',   icon: 'bg-cyan-100 text-cyan-600',   ring: 'ring-cyan-500/10' },
};

export default function StatCard({ label, value, subtitle, icon: Icon, trend, color = 'teal', className = '', children, onClick }: StatCardProps) {
  const c = colorMap[color];
  const TrendIcon = trend ? (trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/60 p-4 hover:shadow-md hover:border-slate-200 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.icon}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {trend && TrendIcon && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${
            trend.value > 0 ? 'text-emerald-700 bg-emerald-50' : trend.value < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-500 bg-slate-50'
          }`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}
