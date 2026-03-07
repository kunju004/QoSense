import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('qos_token');
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('qos_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { token, user } = await authApi.login(email, password);
    localStorage.setItem('qos_token', token);
    setUser(user);
  };

  const signup = async (name, email, password) => {
    const { token, user } = await authApi.signup(name, email, password);
    localStorage.setItem('qos_token', token);
    setUser(user);
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    localStorage.removeItem('qos_token');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
