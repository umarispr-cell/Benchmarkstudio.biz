import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Receipt,
  ClipboardList,
  ChevronRight,
  Upload,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((state: RootState) => state.auth);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ceo', 'director', 'operations_manager', 'supervisor', 'drawer', 'checker', 'qa', 'designer'],
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: FolderKanban,
      roles: ['ceo', 'director', 'operations_manager'],
    },
    {
      name: 'Users',
      href: '/users',
      icon: Users,
      roles: ['ceo', 'director', 'operations_manager'],
    },
    {
      name: 'Invoices',
      href: '/invoices',
      icon: Receipt,
      roles: ['ceo', 'director'],
    },
    {
      name: 'Import Orders',
      href: '/import',
      icon: Upload,
      roles: ['ceo', 'director', 'operations_manager', 'supervisor'],
    },
    {
      name: 'Assign Orders',
      href: '/assign',
      icon: UserPlus,
      roles: ['ceo', 'director', 'operations_manager', 'supervisor'],
    },
    {
      name: 'Rejected Orders',
      href: '/rejected',
      icon: AlertTriangle,
      roles: ['ceo', 'director', 'operations_manager', 'supervisor', 'drawer', 'checker', 'qa', 'designer'],
    },
    {
      name: 'Work Queue',
      href: '/work',
      icon: ClipboardList,
      roles: ['drawer', 'checker', 'qa', 'designer'],
    },
  ];

  const filteredNavigation = navigation.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <div className="w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 flex flex-col shadow-2xl">
      {/* Logo Section */}
      <div className="h-20 flex items-center px-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Benchmark" className="h-10 w-auto" />
          <div className="relative">
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-4">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Main Menu</span>
        </div>
        {filteredNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group relative flex items-center px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-400 to-cyan-500 rounded-full" />
              )}
              <div className={`
                flex items-center justify-center w-9 h-9 rounded-lg mr-3 transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30' 
                  : 'bg-slate-800/50 text-slate-400 group-hover:bg-slate-700/50 group-hover:text-white'
                }
              `}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <span className="flex-1">{item.name}</span>
              <ChevronRight className={`h-4 w-4 transition-all duration-200 ${isActive ? 'text-teal-400 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
            </Link>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-4 m-4 mt-0 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="avatar avatar-lg bg-gradient-to-br from-teal-400 to-cyan-500">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-800" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Status</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
