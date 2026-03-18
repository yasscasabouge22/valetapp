import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { LogOut } from 'lucide-react';

export function ManagerLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const path = location.pathname;

  const links = [
    { path: '/manager/dashboard', label: 'Dashboard',   icon: '📊' },
    { path: '/manager/map',       label: 'Carte GPS',   icon: '🗺️' },
    { path: '/manager/voituriers',label: 'Voituriers',  icon: '👥' },
    { path: '/manager/profil',    label: 'Profil',      icon: '👤' },
  ];

  return <AppLayout links={links} role="Manager" user={user} logout={logout} navigate={navigate} activePath={path}>{children}</AppLayout>;
}

export function AdminLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();
  const path = location.pathname;

  const links = [
    { path: '/admin/dashboard',  label: 'Dashboard',   icon: '📊' },
    { path: '/admin/managers',   label: 'Managers',    icon: '👔' },
    { path: '/admin/voituriers', label: 'Voituriers',  icon: '👥' },
    { path: '/admin/qrcodes',    label: 'Cartes QR',   icon: '🎫' },
    { path: '/admin/parametres', label: 'Paramètres',  icon: '⚙️' },
    { path: '/admin/profil',     label: 'Profil',      icon: '👤' },
  ];

  return <AppLayout links={links} role="Admin" user={user} logout={logout} navigate={navigate} activePath={path}>{children}</AppLayout>;
}

function AppLayout({ children, links, role, user, logout, navigate, activePath }) {
  const isActive = (p) => activePath === p || activePath.startsWith(p + '/');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shadow-sm shrink-0">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">🚗</div>
          <div>
            <div className="font-bold text-gray-900 text-sm">ValetApp</div>
            <div className="text-xs text-gray-400">{role}</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map(({ path, label, icon }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${isActive(path) ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span className="text-base">{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">{user?.avatar || '?'}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">{role}</p>
            </div>
            <button onClick={logout} title="Déconnexion" className="text-gray-300 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 flex">
        {links.slice(0,4).map(({ path, label, icon }) => (
          <button key={path} onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center py-2 text-[10px] transition-colors ${isActive(path) ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className="text-lg">{icon}</span>{label}
          </button>
        ))}
        <button onClick={logout} className="flex-1 flex flex-col items-center py-2 text-[10px] text-gray-400">
          <LogOut className="w-5 h-5" /><span>Quitter</span>
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
    </div>
  );
}
