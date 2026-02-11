import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { authService } from '../../services';
import { Bell, LogOut, Search, Settings, Command } from 'lucide-react';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

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

  return (
    <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 transition-colors group-focus-within:text-teal-500" />
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-11 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 transition-all focus:bg-white focus:border-teal-300 focus:ring-4 focus:ring-teal-100 focus:outline-none"
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
        <button 
          className="relative p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Settings */}
        <button 
          className="p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>

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
  );
};

export default Header;
