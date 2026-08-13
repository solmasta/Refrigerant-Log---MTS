import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ role, children }) {
  const { user, isAuthed } = useAuth();

  if (!isAuthed || !user) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/technician/login'} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={role === 'admin' ? '/admin/login' : '/technician/login'} replace />;
  }
  return children;
}
