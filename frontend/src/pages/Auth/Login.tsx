import { useState, type FormEvent } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials, setLoading } from '../../store/slices/authSlice';
import { authService } from '../../services';
import { Lock, Mail, ArrowRight, Shield } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoadingState] = useState(false);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const response = await authService.login({ email, password });
      dispatch(setCredentials({
        user: response.user,
        token: response.token,
      }));
      navigate('/dashboard');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      setError(message);
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-orange-500 rounded-full filter blur-3xl translate-x-1/2 translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500 rounded-full filter blur-3xl -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="Benchmark" className="h-14 w-auto" />
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl font-bold text-white leading-tight">
              Manage your<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-orange-400">
                workflow with precision
              </span>
            </h1>
            <p className="text-lg text-slate-400 max-w-md">
              Enterprise-grade project management system designed for high-volume workflows across multiple countries.
            </p>
            
            <div className="flex items-center gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-slate-400">Uptime</div>
              </div>
              <div className="h-12 w-px bg-slate-700" />
              <div>
                <div className="text-3xl font-bold text-white">4</div>
                <div className="text-sm text-slate-400">Countries</div>
              </div>
              <div className="h-12 w-px bg-slate-700" />
              <div>
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-slate-400">Support</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <Shield className="h-4 w-4" />
            <span>Enterprise security with role-based access control</span>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.svg" alt="Benchmark" className="h-12 w-auto mb-4" />
          </div>
          
          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2">Sign in to access your dashboard</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl animate-fade-in">
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-lg pl-12"
                  placeholder="your.email@benchmark.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-lg pl-12"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-4 text-base mt-6 group"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Secure session with single-device authentication</span>
            </div>
          </div>
          
          <p className="text-center text-sm text-slate-400 mt-8">
            © {new Date().getFullYear()} Benchmark. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
