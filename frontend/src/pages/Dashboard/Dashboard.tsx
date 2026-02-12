import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '../../store/store';
import CEODashboard from './CEODashboard';
import OperationsManagerDashboard from './OperationsManagerDashboard';
import WorkerDashboard from './WorkerDashboard';

export default function Dashboard() {
  const user = useSelector((state: RootState) => state.auth.user);
  if (!user) return <Navigate to="/login" />;

  switch (user.role) {
    case 'ceo':
    case 'director':
      return <CEODashboard />;
    case 'operations_manager':
      return <OperationsManagerDashboard />;
    case 'drawer':
    case 'checker':
    case 'qa':
    case 'designer':
      return <WorkerDashboard />;
    default:
      return <WorkerDashboard />;
  }
}
