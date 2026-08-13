import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import TechnicianLogin from './pages/TechnicianLogin.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import TechnicianDashboard from './pages/TechnicianDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/technician/login" element={<TechnicianLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/technician"
            element={
              <ProtectedRoute role="technician">
                <TechnicianDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
