import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services';
import { Bell, LogOut, Search, Settings, Command, X } from 'lucide-react';

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setShowSettings(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut for search
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
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logout());
      navigate('/login');
    }
  };

  const searchPages = [
    { name: 'Dashboard', path: '/dashboard', keywords: 'home overview stats' },
    { name: 'Projects', path: '/projects', keywords: 'project manage client' },
    { name: 'Users', path: '/users', keywords: 'user team member staff' },
    { name: 'Invoices', path: '/invoices', keywords: 'invoice billing payment' },
    { name: 'Work Queue', path: '/work', keywords: 'work queue order task' },
    { name: 'Import Orders', path: '/import', keywords: 'import csv upload' },
    { name: 'Assign Orders', path: '/assign', keywords: 'assign supervisor team' },
    { name: 'Rejected Orders', path: '/rejected', keywords: 'rejected rework quality' },
  ];

  const filteredPages = searchQuery
    ? searchPages.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.keywords.includes(searchQuery.toLowerCase())
      )
    : searchPages;

  const handleSearchNavigate = (path: string) => {
    navigate(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  const notifications = [
    { id: 1, text: 'New order imported successfully', time: '2 min ago', read: false },
    { id: 2, text: 'Invoice #INV-003 approved', time: '15 min ago', read: false },
    { id: 3, text: 'Worker assignment completed', time: '1 hour ago', read: true },
    { id: 4, text: 'Project deadline approaching', time: '3 hours ago', read: true },
  ];

  return (
    <>
      <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative group cursor-pointer" onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 100); }}>
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-teal-500" />
            <input
              type="text"
              placeholder="Search anything..."
              readOnly
              className="w-full pl-11 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 transition-all cursor-pointer focus:bg-white focus:border-teal-300 focus:ring-4 focus:ring-teal-100 focus:outline-none"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-medium text-slate-400">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-6">
          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowSettings(false); }}
              className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-teal-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        {!n.read && <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />}
                        <div className={!n.read ? '' : 'ml-5'}>
                          <p className="text-sm text-slate-700">{n.text}</p>
                          <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-slate-100">
                  <button className="text-sm text-teal-600 font-medium hover:text-teal-700">Mark all as read</button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button 
              onClick={() => { setShowSettings(!showSettings); setShowNotifications(false); }}
              className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>

            {showSettings && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                <div className="p-2">
                  {[
                    { label: 'Profile Settings', action: () => {} },
                    { label: 'Notification Preferences', action: () => {} },
                    { label: 'Security', action: () => {} },
                    { label: 'Help & Support', action: () => {} },
                  ].map((item, i) => (
                    <button key={i} onClick={() => { item.action(); setShowSettings(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors">
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-slate-200 mx-2" />

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.country || 'Global'}</p>
            </div>
            <div className="relative">
              <div className="avatar avatar-md bg-gradient-to-br from-teal-500 to-cyan-600 ring-2 ring-white shadow-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="ml-2 p-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-200"
            aria-label="Logout"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Command Palette / Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowSearch(false); setSearchQuery(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
            <div className="flex items-center gap-3 px-4 border-b border-slate-100">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredPages.length > 0) {
                    handleSearchNavigate(filteredPages[0].path);
                  }
                }}
                placeholder="Search pages, features..."
                className="flex-1 py-4 text-sm border-0 focus:ring-0 focus:outline-none bg-transparent"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredPages.map((page) => (
                <button
                  key={page.path}
                  onClick={() => handleSearchNavigate(page.path)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-teal-50 hover:text-teal-700 rounded-xl transition-colors"
                >
                  <span className="font-medium">{page.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{page.path}</span>
                </button>
              ))}
              {filteredPages.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">No results found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
