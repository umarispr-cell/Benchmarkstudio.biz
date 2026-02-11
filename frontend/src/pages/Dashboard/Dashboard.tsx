import { Sparkles, ArrowRight } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Welcome</span>
      </div>
      <h1 className="text-3xl lg:text-4xl font-bold text-slate-900">Dashboard</h1>
      <p className="text-slate-500 mt-2">Welcome to Benchmark Management System</p>
      
      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-8 text-white shadow-xl shadow-teal-500/30">
        <h2 className="text-2xl font-bold mb-2">Get Started</h2>
        <p className="text-teal-100 mb-6">Explore the features available for your role.</p>
        <button className="bg-white text-teal-600 px-5 py-2.5 rounded-xl font-semibold inline-flex items-center gap-2 hover:bg-teal-50 transition-colors">
          Explore
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
