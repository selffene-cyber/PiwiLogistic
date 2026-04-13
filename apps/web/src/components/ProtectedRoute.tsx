import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: 'ADMIN' | 'CONDUCTOR';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasCheckedAuth = useAuthStore((s) => s.hasCheckedAuth);
  const isLoading = useAuthStore((s) => s.isLoading);
  const location = useLocation();

  if (!hasCheckedAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user?.role?.codigo !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}