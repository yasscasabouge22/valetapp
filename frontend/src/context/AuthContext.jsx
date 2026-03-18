import { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext(null);
const BACKEND = `${location.protocol}//${location.hostname}:3001`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('vt_token');
    if (!token) { setLoading(false); return; }
    fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(({ user: u }) => { if (u) setUser(u); else localStorage.removeItem('vt_token'); })
      .catch(() => localStorage.removeItem('vt_token'))
      .finally(() => setLoading(false));
  }, []);

  const login  = async (token, u) => { localStorage.setItem('vt_token', token); setUser(u); };
  const logout = async () => {
    const token = localStorage.getItem('vt_token');
    if (token) fetch(`${BACKEND}/api/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('vt_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
