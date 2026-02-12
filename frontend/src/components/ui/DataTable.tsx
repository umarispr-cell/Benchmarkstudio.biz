import React, { useState, useMemo, type ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  loading?: boolean;
  emptyIcon?: React.ComponentType<any> | ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  className?: string;
  compact?: boolean;
}

export default function DataTable<T extends Record<string, any>>({
  columns, data, keyField = 'id', loading, emptyIcon, emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.', pageSize = 10, onRowClick, className = '', compact = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]; const bVal = b[sortKey];
      if (aVal == null) return 1; if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200/60 overflow-hidden ${className}`}>
        <div className="animate-pulse">
          <div className="h-11 bg-slate-50 border-b border-slate-100" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-50">
              {columns.map((_, j) => (
                <div key={j} className="h-4 bg-slate-100 rounded flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200/60 ${className}`}>
        <div className="flex flex-col items-center justify-center py-16 px-6">
          {emptyIcon && <div className="mb-4 text-slate-300">{React.isValidElement(emptyIcon) ? emptyIcon : React.createElement(emptyIcon as React.ComponentType<any>, { className: 'w-10 h-10' })}</div>}
          <h3 className="text-sm font-semibold text-slate-700">{emptyTitle}</h3>
          <p className="text-sm text-slate-400 mt-1 text-center max-w-xs">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  const cellPad = compact ? 'px-4 py-2' : 'px-4 py-3';

  return (
    <div className={`bg-white rounded-xl border border-slate-200/60 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`${cellPad} text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-50/80 ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''} ${col.className || ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-slate-300">
                        {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />) : <ChevronsUpDown className="h-3.5 w-3.5" />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <AnimatePresence mode="popLayout">
              {paged.map((row, idx) => (
                <motion.tr
                  key={row[keyField] ?? idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`group ${onRowClick ? 'cursor-pointer' : ''} hover:bg-slate-50/80 transition-colors`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`${cellPad} text-sm text-slate-700 ${col.className || ''}`}>
                      {col.render ? col.render(row, page * pageSize + idx) : row[col.key]}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
