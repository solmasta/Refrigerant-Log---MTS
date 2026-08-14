import { createContext, useContext, useState, useCallback } from 'react';
import { api, setSession, clearSession, getStoredUser, getToken, setLastTechnicianName } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser());

  const loginTechnician = useCallback(async (firstName, lastName) => {
    const data = await api.technicianLogin(firstName, lastName);
    const sessionUser = { role: 'technician', ...data.technician };
    setSession(data.token, sessionUser);
    setUser(sessionUser);
    setLastTechnicianName(data.technician.firstName, data.technician.lastName);
    return sessionUser;
  }, []);

  const loginAdmin = useCallback(async (password) => {
    const data = await api.adminLogin(password);
    const sessionUser = { role: 'admin' };
    setSession(data.token, sessionUser);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthed: !!getToken(), loginTechnician, loginAdmin, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
