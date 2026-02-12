import { AnimatedPage, PageHeader } from '../../components/ui';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <AnimatedPage>
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to Benchmark Management System"
      />
      <div className="bg-white rounded-xl border border-slate-200/60 p-12 text-center">
        <LayoutDashboard className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Your dashboard is being configured.</p>
      </div>
    </AnimatedPage>
  );
}
