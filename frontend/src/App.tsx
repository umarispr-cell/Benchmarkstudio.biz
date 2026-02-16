import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store/store';
import { authService } from './services';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import CEODashboard from './pages/Dashboard/CEODashboard';
import OperationsManagerDashboard from './pages/Dashboard/OperationsManagerDashboard';
import WorkerDashboard from './pages/Dashboard/WorkerDashboard';
import ProjectManagement from './pages/Projects/ProjectManagement';
import UserManagement from './pages/Users/UserManagement';
import InvoiceManagement from './pages/Invoices/InvoiceManagement';
import WorkQueue from './pages/Workflow/WorkQueue';
import ImportOrders from './pages/Workflow/ImportOrders';
import RejectedOrders from './pages/Workflow/RejectedOrders';
import SupervisorAssignment from './pages/Workflow/SupervisorAssignment';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  // Session monitoring effect
  useEffect(() => {
    if (isAuthenticated) {
      // Set up session check interval (every 5 minutes)
      const sessionCheck = setInterval(async () => {
        try {
          await authService.sessionCheck();
        } catch {
          // Session invalid, logout
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }, 5 * 60 * 1000);

      return () => clearInterval(sessionCheck);
    }
  }, [isAuthenticated]);

  const getDashboardRoute = () => {
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
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={getDashboardRoute()} />
          <Route path="dashboard" element={getDashboardRoute()} />
          
          <Route 
            path="projects/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director', 'operations_manager']}>
                <ProjectManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="users/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director', 'operations_manager']}>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="invoices/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director']}>
                <InvoiceManagement />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="work/*" 
            element={
              <ProtectedRoute allowedRoles={['drawer', 'checker', 'qa', 'designer']}>
                <WorkQueue />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="import/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director', 'operations_manager']}>
                <ImportOrders />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="rejected/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director', 'operations_manager', 'drawer', 'checker', 'qa', 'designer']}>
                <RejectedOrders />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="assign/*" 
            element={
              <ProtectedRoute allowedRoles={['ceo', 'director', 'operations_manager']}>
                <SupervisorAssignment />
              </ProtectedRoute>
            } 
          />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
