import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Car, QrCode, LogOut, Plus, Ban, Trash2, Phone, Mail, Lock, Eye, EyeOff, Download, X, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;

async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem('vt_token');
  const res = await fetch(`${BACKEND}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  return res.json();
}

const STATUS_CFG = {
  parking:'bg-amber-100 text-amber-700', parked:'bg-emerald-100 text-emerald-700',
  requested:'bg-red-100 text-red-700', accepted:'bg-violet-100 text-violet-700',
  returning:'bg-blue-100 text-blue-700', arrived:'bg-emerald-100 text-emerald-700', done:'bg-gray-100 text-gray-600',
};
const STATUS_LABEL = { parking:'Stationnement', parked:'Stationné', requested:'🔔 Récupération', accepted:'Acceptée', returning:'En retour', arrived:'Arrivé', done:'Terminé' };

// ─── Login Admin ─────────────────────────────────────────────
export function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail]       = useState('admin@valetapp.ma');
  const [password, setPassword] = useState('admin123');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      if (!data.token) throw new Error(data.error || 'Erreur de connexion');
      await login(data.token, data.user);
      navigate(data.user.role === 'admin' ? '/admin/dashboard' : '/manager/dashboard');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🚗</div>
          <h1 className="text-2xl font-bold text-white">ValetApp</h1>
          <p className="text-gray-400 text-sm mt-1">Administration · Manager</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50 transition-all">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-gray-300">Comptes de démonstration :</p>
          <p>Admin : admin@valetapp.ma / admin123</p>
          <p>Manager : ahmed@valetapp.ma / mgr123</p>
        </div>
      </div>
    </div>
  );
}

// ─── Layout Admin ────────────────────────────────────────────
function AdminLayout({ children, active }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: Users,           label: 'Managers',  path: '/admin/managers' },
    { icon: Car,             label: 'Voituriers', path: '/admin/voituriers' },
    { icon: QrCode,          label: 'Cartes QR',  path: '/admin/qrcodes' },
  ];
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">A</div>
          <div><div className="font-bold text-gray-900 text-sm">ValetApp</div><div className="text-xs text-gray-400">Admin</div></div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active === path ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className={`w-4 h-4 ${active === path ? 'text-emerald-600' : 'text-gray-400'}`} />{label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">{user?.avatar}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p><p className="text-xs text-gray-400">Administrateur</p></div>
            <button onClick={logout} className="text-gray-300 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900">ValetApp Admin</span>
          <div className="flex gap-2">
            {links.map(({ icon: Icon, path }) => (
              <button key={path} onClick={() => navigate(path)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${active === path ? 'bg-emerald-50 text-emerald-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
            <button onClick={logout} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── Admin Dashboard ─────────────────────────────────────────
export function AdminDashboard() {
  const [missions, setMissions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [valets,   setValets]   = useState([]);
  const { toasts, addToast, removeToast } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [ms, mgrs, vs] = await Promise.all([
        api.getMissions(),
        apiFetch('/api/managers'),
        apiFetch('/api/users?all=true'),
      ]);
      setMissions(ms.missions || []);
      setManagers(mgrs.managers || []);
      setValets(vs.users || []);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    mission_created: ({ mission }) => { setMissions(p => [mission, ...p]); addToast({ type:'accepted', title:'Nouvelle mission', body: mission.vehicle.marque }); },
    mission_updated: ({ mission }) => setMissions(p => p.map(m => m.id === mission.id ? mission : m)),
    mission_done:    ({ mission }) => setMissions(p => p.filter(m => m.id !== mission.id)),
  });

  const active = missions.filter(m => m.status !== 'done');
  const done   = missions.filter(m => m.status === 'done').length;

  return (
    <AdminLayout active="/admin/dashboard">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="p-4 md:p-6 space-y-5 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Global</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />Système actif · Temps réel
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Managers',    value: managers.length, color: 'bg-violet-50 text-violet-600', icon: Users },
            { label: 'Voituriers',  value: valets.length,   color: 'bg-blue-50 text-blue-600',   icon: Car },
            { label: 'Missions act.',value: active.length,  color: 'bg-amber-50 text-amber-600', icon: LayoutDashboard },
            { label: 'Terminées',   value: done,            color: 'bg-emerald-50 text-emerald-600', icon: Check },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}><Icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Toutes les missions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Toutes les missions</h3>
            <button onClick={load} className="text-xs text-emerald-600 font-semibold hover:underline">↻ Actualiser</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Ticket','Voiturier','Véhicule','Statut','Heure'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missions.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Aucune mission</td></tr>}
                {missions.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{m.ticket}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.valetName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 hidden sm:table-cell">{m.vehicle.marque}</td>
                    <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CFG[m.status] || ''}`}>{STATUS_LABEL[m.status] || m.status}</span></td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Admin Managers ──────────────────────────────────────────
export function AdminManagers() {
  const [managers, setManagers] = useState([]);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm] = useState({ name:'', email:'', password:'mgr123', phone:'' });
  const [error, setError] = useState('');

  useEffect(() => { apiFetch('/api/managers').then(d => setManagers(d.managers || [])); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setError('');
    const res = await fetch(`${BACKEND}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vt_token')}` },
      body: JSON.stringify({ ...form, role: 'manager' }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setManagers(p => [...p, data.user]); setShowAdd(false); setForm({ name:'', email:'', password:'mgr123', phone:'' });
  };

  const handleToggleBlock = async (m) => {
    await apiFetch(`/api/users/${m.id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !m.blocked }) });
    setManagers(p => p.map(x => x.id === m.id ? { ...x, blocked: !x.blocked } : x));
  };

  const handleDelete = async (m) => {
    await apiFetch(`/api/users/${m.id}`, { method: 'DELETE' });
    setManagers(p => p.filter(x => x.id !== m.id));
  };

  return (
    <AdminLayout active="/admin/managers">
      <div className="p-4 md:p-6 space-y-5 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div><h1 className="text-xl font-bold text-gray-900">Managers</h1><p className="text-sm text-gray-500">{managers.length} manager{managers.length > 1 ? 's' : ''}</p></div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
            <Plus className="w-4 h-4" />Ajouter
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Manager','Email','Téléphone','Statut','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {managers.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Aucun manager</td></tr>}
              {managers.map(m => (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">{m.avatar || m.name[0]}</div>
                      <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{m.email}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 hidden sm:table-cell">{m.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.blocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                      {m.blocked ? 'Bloqué' : 'Actif'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleBlock(m)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${m.blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}><Ban className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(m)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showAdd && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Ajouter un manager</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
                {[['name','Nom complet','Ahmed Mansouri'],['email','Email','ahmed@valetapp.ma'],['password','Mot de passe','mgr123'],['phone','Téléphone','+212 6 XX XX XX XX']].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{l}</label>
                    <input type={k==='password'?'password':'text'} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={p} required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Créer</button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Admin Voituriers ────────────────────────────────────────
export function AdminVoituriers() {
  const [valets, setValets] = useState([]);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/users?all=true'),
      apiFetch('/api/managers'),
    ]).then(([vs, ms]) => { setValets(vs.users || []); setManagers(ms.managers || []); });
  }, []);

  const getManagerName = (id) => managers.find(m => m.id === id)?.name || '—';

  const handleToggleBlock = async (v) => {
    await apiFetch(`/api/users/${v.id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !v.blocked }) });
    setValets(p => p.map(x => x.id === v.id ? { ...x, blocked: !x.blocked } : x));
  };

  const handleDelete = async (v) => {
    await apiFetch(`/api/users/${v.id}`, { method: 'DELETE' });
    setValets(p => p.filter(x => x.id !== v.id));
  };

  return (
    <AdminLayout active="/admin/voituriers">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl">
        <div><h1 className="text-xl font-bold text-gray-900">Tous les voituriers</h1><p className="text-sm text-gray-500">{valets.length} voiturier{valets.length > 1 ? 's' : ''}</p></div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Voiturier','Téléphone','Manager','Statut','Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {valets.length === 0 && <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Aucun voiturier</td></tr>}
              {valets.map(v => (
                <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.avatar}</div>
                      <div><p className="text-sm font-semibold text-gray-900">{v.name}</p>{v.matricule && <p className="text-xs text-gray-400 font-mono">{v.matricule}</p>}</div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{v.phone}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{getManagerName(v.managerId)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.blocked ? 'Bloqué' : v.status === 'online' ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggleBlock(v)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${v.blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}><Ban className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(v)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Admin QR Codes ──────────────────────────────────────────
export function AdminQRCodes() {
  const [qrCards, setQrCards] = useState([]);
  const [stats,   setStats]   = useState({});
  const [showGen, setShowGen] = useState(false);
  const [qty,     setQty]     = useState('10');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [filter,  setFilter]  = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    const data = await apiFetch('/api/qrcodes');
    setQrCards(data.qrCards || []);
    setStats(data.stats || {});
  }

  const filtered = filter === 'all' ? qrCards : qrCards.filter(q => q.status === filter);

  const handleGenerate = async () => {
    setGenerating(true);
    const data = await apiFetch('/api/qrcodes/generate', { method: 'POST', body: JSON.stringify({ count: parseInt(qty) }) });
    if (data.cards) setQrCards(p => [...data.cards, ...p]);
    setGenerating(false); setShowGen(false);
  };

  const handleDisable = async (id) => {
    await apiFetch(`/api/qrcodes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) });
    setQrCards(p => p.map(q => q.id === id ? { ...q, status: 'disabled' } : q));
  };

  const handleDelete = async (id) => {
    await apiFetch(`/api/qrcodes/${id}`, { method: 'DELETE' });
    setQrCards(p => p.filter(q => q.id !== id));
  };

  const STATUS_STYLE = {
    available: 'bg-emerald-100 text-emerald-700',
    in_use:    'bg-blue-100 text-blue-700',
    disabled:  'bg-red-100 text-red-700',
  };
  const STATUS_LABEL = { available:'Disponible', in_use:'En mission', disabled:'Désactivé' };

  return (
    <AdminLayout active="/admin/qrcodes">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div><h1 className="text-xl font-bold text-gray-900">Cartes QR</h1><p className="text-sm text-gray-500">{qrCards.length} cartes générées</p></div>
          <button onClick={() => setShowGen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
            <Plus className="w-4 h-4" />Générer des cartes
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[['Disponibles', stats.available || qrCards.filter(q=>q.status==='available').length, 'text-emerald-600'],
            ['En mission',  stats.inUse     || qrCards.filter(q=>q.status==='in_use').length,    'text-blue-600'],
            ['Désactivées', stats.disabled  || qrCards.filter(q=>q.status==='disabled').length,  'text-red-600']
          ].map(([l,v,c]) => (
            <div key={l} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className={`text-2xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {[['all','Toutes'],['available','Disponibles'],['in_use','En mission'],['disabled','Désactivées']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter===v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{l}
            </button>
          ))}
        </div>

        {/* Grille QR */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(qr => (
            <div key={qr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gray-50 p-4 flex items-center justify-center">
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                  <QRCodeSVG
                    value={`${location.protocol}//${location.hostname}:5173/client/ticket/${qr.id}`}
                    size={72} level="M"
                    fgColor={qr.status === 'disabled' ? '#9ca3af' : '#111827'}
                  />
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="font-bold text-gray-900 text-xs font-mono text-center">{qr.id}</p>
                <div className="flex justify-center">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLE[qr.status] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[qr.status] || qr.status}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 pt-1 border-t border-gray-100">
                  <button onClick={() => setPreview(qr.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Aperçu">
                    <Eye className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <button onClick={() => handleDisable(qr.id)} className="p-1.5 hover:bg-orange-50 rounded-lg" title="Désactiver">
                    <Ban className="w-3.5 h-3.5 text-orange-500" />
                  </button>
                  <button onClick={() => handleDelete(qr.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Supprimer">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal générer */}
        {showGen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !generating && setShowGen(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Générer des cartes QR</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nombre de cartes</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['10','50','100'].map(n => (
                      <button key={n} onClick={() => setQty(n)}
                        className={`py-3 rounded-xl border-2 font-bold text-xl transition-all ${qty===n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{n}</button>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-700">
                  Les cartes générées encodent l'URL de votre application pour permettre l'accès au ticket client.
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowGen(false)} disabled={generating} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 disabled:opacity-50">Annuler</button>
                  <button onClick={handleGenerate} disabled={generating}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2">
                    {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Génération…</> : `Générer ${qty} cartes`}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Modal aperçu */}
        {preview && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setPreview(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 bg-white rounded-2xl shadow-2xl z-50 p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Aperçu carte</h2>
                <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-dashed border-gray-200 mb-4">
                <div className="bg-emerald-600 rounded-t-xl py-2 -mx-1 mb-3 text-white text-xs font-bold">🚗 Service Voiturier</div>
                <div className="flex justify-center mb-3">
                  <div className="bg-white p-2 rounded-xl border border-gray-100">
                    <QRCodeSVG
                      value={`${location.protocol}//${location.hostname}:5173/client/ticket/${preview}`}
                      size={120} level="H" fgColor="#111827"
                    />
                  </div>
                </div>
                <p className="font-mono font-bold text-gray-900 text-sm">{preview}</p>
                <p className="text-xs text-gray-400 mt-1">Scannez pour accéder à votre ticket</p>
              </div>
              <p className="text-xs text-gray-500">
                URL encodée : <span className="font-mono text-emerald-600 break-all">{location.protocol}//{location.hostname}:5173/client/ticket/{preview}</span>
              </p>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
