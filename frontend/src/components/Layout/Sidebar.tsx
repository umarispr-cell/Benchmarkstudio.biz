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
    <div className="w-60 bg-slate-900 flex flex-col">
      {/* Logo Section */}
      <div className="h-12 flex items-center px-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Benchmark" className="h-10 w-auto" />
          <div className="relative">
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-3 mb-3">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Menu</span>
        </div>
        {filteredNavigation.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                group relative flex items-center px-3 py-2.5 text-xs font-medium rounded-lg transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-teal-500/20 to-cyan-500/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-teal-400 rounded-full" />
              )}
              <div className={`
                flex items-center justify-center w-7 h-7 rounded-md mr-2.5 transition-all duration-200
                ${isActive 
                  ? 'bg-teal-500/20 text-teal-400' 
                  : 'text-slate-400 group-hover:text-slate-300'
                }
              `}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="flex-1">{item.name}</span>
              <ChevronRight className={`h-3 w-3 transition-all duration-200 ${isActive ? 'text-teal-400 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
            </Link>
          );
        })}
      </nav>

      {/* User Profile Card */}
      <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-[1.5px] border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
