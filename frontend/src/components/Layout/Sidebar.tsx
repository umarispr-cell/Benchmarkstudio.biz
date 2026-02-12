import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Users, Receipt, ClipboardList,
  Upload, AlertTriangle, UserPlus, ChevronsLeft, ChevronsRight,
} from 'lucide-react';

const NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ceo','director','operations_manager','supervisor','drawer','checker','qa','designer'] },
  { name: 'Projects', href: '/projects', icon: FolderKanban, roles: ['ceo','director','operations_manager'] },
  { name: 'Users', href: '/users', icon: Users, roles: ['ceo','director','operations_manager'] },
  { name: 'Invoices', href: '/invoices', icon: Receipt, roles: ['ceo','director'] },
  { name: 'Import Orders', href: '/import', icon: Upload, roles: ['ceo','director','operations_manager','supervisor'] },
  { name: 'Assignments', href: '/assign', icon: UserPlus, roles: ['ceo','director','operations_manager','supervisor'] },
  { name: 'Rejected', href: '/rejected', icon: AlertTriangle, roles: ['ceo','director','operations_manager','supervisor','drawer','checker','qa','designer'] },
  { name: 'Work Queue', href: '/work', icon: ClipboardList, roles: ['drawer','checker','qa','designer'] },
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [collapsed, setCollapsed] = useState(false);

  const items = NAV.filter(i => user?.role && i.roles.includes(user.role));

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen bg-white border-r border-slate-200/80 flex flex-col shrink-0 relative z-20"
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-slate-100 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="text-[15px] font-bold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden"
              >
                Benchmark
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav */}
      <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <div className="px-3 mb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
          </div>
        )}
        {items.map(item => {
          const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              title={collapsed ? item.name : undefined}
              className={`group flex items-center gap-3 rounded-lg transition-all duration-150 relative ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'} ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[13px] font-medium whitespace-nowrap"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className={`border-t border-slate-100 ${collapsed ? 'p-2' : 'p-3'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <div className="live-dot shrink-0" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
