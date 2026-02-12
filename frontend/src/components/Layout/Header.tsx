import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services';
import {
  Bell,
  LogOut,
  Search,
  Settings,
  Command,
  X,
  User,
  Shield,
  HelpCircle,
  BellRing,
} from 'lucide-react';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifications(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setShowSettings(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  const pages = [
    { name: 'Dashboard', path: '/dashboard', keywords: 'home overview stats' },
    { name: 'Projects', path: '/projects', keywords: 'project manage client' },
    { name: 'Users', path: '/users', keywords: 'user team member staff' },
    { name: 'Invoices', path: '/invoices', keywords: 'invoice billing payment' },
    { name: 'Work Queue', path: '/work', keywords: 'work queue order task' },
    { name: 'Import Orders', path: '/import', keywords: 'import csv upload' },
    { name: 'Assign Orders', path: '/assign', keywords: 'assign supervisor team' },
    {
      name: 'Rejected Orders',
      path: '/rejected',
      keywords: 'rejected rework quality',
    },
  ];

  const filtered = searchQuery
    ? pages.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.keywords.includes(searchQuery.toLowerCase())
      )
    : pages;

  const notifications = [
    { id: 1, text: 'New order imported successfully', time: '2m ago', read: false },
    { id: 2, text: 'Invoice #INV-003 approved', time: '15m ago', read: false },
    { id: 3, text: 'Worker assignment completed', time: '1h ago', read: true },
    { id: 4, text: 'Project deadline approaching', time: '3h ago', read: true },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="h-12 bg-white border-b border-slate-200/80 flex items-center justify-between px-4 sticky top-0 z-40">
        {/* Search */}
        <div className="flex-1 max-w-sm">
          <div
            className="relative cursor-pointer"
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchRef.current?.focus(), 100);
            }}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              readOnly
              className="w-full pl-9 pr-16 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 cursor-pointer hover:border-slate-300 transition-colors focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-medium text-slate-400">
              <Command className="h-2.5 w-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1 ml-4">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowSettings(false);
              }}
              className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-rose-500 rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-10 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-medium text-teal-600">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-3.5 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-teal-50/20' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1 flex-shrink-0" />
                        )}
                        <div className={!n.read ? '' : 'ml-3.5'}>
                          <p className="text-[11px] text-slate-600 leading-tight">
                            {n.text}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {n.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3.5 py-2 border-t border-slate-100 text-center">
                  <button className="text-[11px] text-teal-600 font-medium hover:text-teal-700">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowNotifications(false);
              }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="p-1.5">
                  {[
                    { label: 'Profile', icon: User },
                    { label: 'Notifications', icon: BellRing },
                    { label: 'Security', icon: Shield },
                    { label: 'Help', icon: HelpCircle },
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setShowSettings(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <item.icon className="h-3.5 w-3.5 text-slate-400" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
            <div className="relative">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-[1.5px] border-white" />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="ml-1 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Command Palette */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="flex items-center gap-2.5 px-3.5 border-b border-slate-100">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filtered.length > 0) {
                    navigate(filtered[0].path);
                    setShowSearch(false);
                    setSearchQuery('');
                  }
                }}
                placeholder="Search pages..."
                className="flex-1 py-3 text-xs border-0 focus:ring-0 focus:outline-none bg-transparent"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              {filtered.map((p) => (
                <button
                  key={p.path}
                  onClick={() => {
                    navigate(p.path);
                    setShowSearch(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-lg transition-colors"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-[10px] text-slate-400 ml-auto">
                    {p.path}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No results
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
