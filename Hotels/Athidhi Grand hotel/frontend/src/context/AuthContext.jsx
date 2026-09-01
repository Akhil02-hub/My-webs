import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try { await api.get('/csrf'); } catch {}
      try {
        await api.get('/admin/check');
        if (active) setIsAuthenticated(true);
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = async (username, password) => {
    await api.post('/admin/login', { username, password });
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try { await api.post('/admin/logout'); } finally { setIsAuthenticated(false); }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
