import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Login from './Login';

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Login />;
}
