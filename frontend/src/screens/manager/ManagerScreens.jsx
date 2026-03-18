import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Car, Clock, AlertCircle, Bell, ChevronRight, ArrowLeft, Plus, Ban, Trash2, Phone, Check, X } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';

const STATUS_CFG = {
  parking:   { label: 'Stationnement', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  parked:    { label: 'Stationné',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  requested: { label: '🔔 Récupération', color: 'bg-red-100 text-red-700 border-red-200' },
  accepted:  { label: 'Acceptée',      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  returning: { label: 'En retour',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  arrived:   { label: 'Arrivé',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  done:      { label: 'Terminé',       color: 'bg-gray-100 text-gray-600 border-gray-200' },
};

// ─── Layout Manager ──────────────────────────────────────────
function ManagerLayout({ children, active }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const links = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/manager/dashboard' },
    { icon: Users,           label: 'Voituriers', path: '/manager/voituriers' },
  ];
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shadow-sm">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">V</div>
          <div>
            <div className="font-bold text-gray-900 text-sm">ValetApp</div>
            <div className="text-xs text-gray-400">Manager</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {links.map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${active === path ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className={`w-4 h-4 ${active === path ? 'text-violet-600' : 'text-gray-400'}`} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-700">{user?.avatar}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p><p className="text-xs text-gray-400">Manager</p></div>
            <button onClick={logout} className="text-gray-300 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {/* Mobile topbar */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-gray-900">ValetApp Manager</span>
          <div className="flex gap-2">
            {links.map(({ icon: Icon, path }) => (
              <button key={path} onClick={() => navigate(path)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${active === path ? 'bg-violet-50 text-violet-600' : 'text-gray-400 hover:bg-gray-100'}`}>
                <Icon className="w-5 h-5" />
              </button>
            ))}
            <button onClick={logout} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

// ─── Manager Dashboard ───────────────────────────────────────
export function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [valets, setValets]     = useState([]);
  const [unread, setUnread]     = useState(0);
  const { toasts, addToast, removeToast, requestPermission } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => {
    requestPermission();
    load();
  }, []);

  async function load() {
    try {
      const [{ missions: ms }, { users: vs }] = await Promise.all([
        api.getMissions(),
        fetch(`${location.protocol}//${location.hostname}:3001/api/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('vt_token')}` }
        }).then(r => r.json()),
      ]);
      setMissions(ms);
      setValets(vs);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    mission_created: ({ mission }) => { setMissions(p => [mission, ...p]); setUnread(c => c+1); addToast({ type: 'accepted', title: 'Nouvelle mission', body: `${mission.vehicle.marque} · ${mission.ticket}` }); },
    mission_updated: ({ mission }) => setMissions(p => p.map(m => m.id === mission.id ? mission : m)),
    mission_done:    ({ mission }) => setMissions(p => p.filter(m => m.id !== mission.id)),
  });

  const active   = missions.filter(m => m.status !== 'done');
  const parked   = active.filter(m => m.status === 'parked').length;
  const returning= active.filter(m => m.status === 'returning').length;
  const requested= active.filter(m => m.status === 'requested').length;
  const done     = missions.filter(m => m.status === 'done').length;
  const onlineValets = valets.filter(v => v.status === 'online').length;

  return (
    <ManagerLayout active="/manager/dashboard">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="p-4 md:p-6 space-y-5 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-MA', { weekday:'long', day:'numeric', month:'long' })}</p>
          </div>
          {unread > 0 && (
            <button onClick={() => setUnread(0)} className="flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl text-sm font-semibold">
              <Bell className="w-4 h-4" />{unread} nouvelle{unread>1?'s':''} notification{unread>1?'s':''}
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Missions actives', value: active.length, icon: Car,          color: 'bg-blue-50 text-blue-600' },
            { label: 'Stationnés',       value: parked,        icon: Check,         color: 'bg-emerald-50 text-emerald-600' },
            { label: 'En retour',        value: returning,     icon: Clock,         color: 'bg-amber-50 text-amber-600' },
            { label: 'Récupérations',    value: requested,     icon: AlertCircle,   color: requested > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Voituriers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Mon équipe</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{onlineValets}/{valets.length} en ligne</span>
              <button onClick={() => navigate('/manager/voituriers')} className="text-xs text-violet-600 font-semibold hover:underline">Gérer →</button>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {valets.length === 0 && <p className="p-5 text-sm text-gray-400 text-center">Aucun voiturier dans votre équipe</p>}
            {valets.map(v => {
              const myMissions = active.filter(m => m.valetId === v.id || m.acceptedBy === v.id);
              return (
                <div key={v.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                    <p className="text-xs text-gray-400">{myMissions.length} mission{myMissions.length > 1 ? 's' : ''} active{myMissions.length > 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${v.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs font-medium ${v.status === 'online' ? 'text-emerald-600' : 'text-gray-400'}`}>{v.status === 'online' ? 'En ligne' : 'Hors ligne'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Missions en cours</h3>
            <button onClick={load} className="text-xs text-violet-600 font-semibold hover:underline">↻ Actualiser</button>
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
                {active.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Aucune mission active</td></tr>
                )}
                {active.map(m => {
                  const cfg = STATUS_CFG[m.status] || STATUS_CFG.parking;
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{m.ticket}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{m.valetName}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 hidden sm:table-cell">{m.vehicle.marque}</td>
                      <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historique */}
        {done > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">Missions terminées aujourd'hui <span className="text-violet-600 ml-1">{done}</span></h3>
            </div>
            <div className="divide-y divide-gray-50">
              {missions.filter(m => m.status === 'done').map(m => (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center shrink-0"><Car className="w-4 h-4 text-gray-400" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{m.ticket} · {m.vehicle.marque}</p>
                    <p className="text-xs text-gray-400">{m.valetName} · {m.vehicle.immatriculation}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-gray-100 text-gray-500 border-gray-200">Terminé</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}

// ─── Manager Voituriers ──────────────────────────────────────
export function ManagerValets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [valets, setValets]       = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadValets(); }, []);

  async function loadValets() {
    try {
      const res = await fetch(`${location.protocol}//${location.hostname}:3001/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('vt_token')}` }
      });
      const { users: vs } = await res.json();
      setValets(vs);
    } catch {}
  }

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const res = await fetch(`${location.protocol}//${location.hostname}:3001/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vt_token')}` },
        body: JSON.stringify({ ...form, managerId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setValets(p => [...p, data.user]);
      setShowAdd(false); setForm({ name: '', phone: '' });
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  const handleToggleBlock = async (v) => {
    await fetch(`${location.protocol}//${location.hostname}:3001/api/users/${v.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('vt_token')}` },
      body: JSON.stringify({ blocked: !v.blocked }),
    });
    setValets(p => p.map(x => x.id === v.id ? { ...x, blocked: !x.blocked } : x));
  };

  const handleDelete = async (v) => {
    await fetch(`${location.protocol}//${location.hostname}:3001/api/users/${v.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('vt_token')}` },
    });
    setValets(p => p.filter(x => x.id !== v.id));
    setDeleteTarget(null);
  };

  return (
    <ManagerLayout active="/manager/voituriers">
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mon équipe</h1>
            <p className="text-sm text-gray-500">{valets.length} voiturier{valets.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Ajouter
          </button>
        </div>

        <div className="space-y-3">
          {valets.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucun voiturier dans votre équipe</p>
            </div>
          )}
          {valets.map(v => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                  {v.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">{v.name}</span>
                    {v.blocked && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600">Bloqué</span>}
                    {!v.blocked && <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.status === 'online' ? 'En ligne' : 'Hors ligne'}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                    <Phone className="w-3 h-3" />{v.phone}
                  </div>
                  {v.matricule && <p className="text-xs text-gray-300 font-mono mt-0.5">{v.matricule}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleBlock(v)} title={v.blocked ? 'Débloquer' : 'Bloquer'}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${v.blocked ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-orange-50 text-orange-500 hover:bg-orange-100'}`}>
                    <Ban className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(v)} className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal ajouter */}
        {showAdd && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Ajouter un voiturier</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
                {[['name','Nom complet','Mohammed Alami'],['phone','Téléphone','+212 6 XX XX XX XX']].map(([k,l,p]) => (
                  <div key={k}>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{l} *</label>
                    <input type="text" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={p} required
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-all" />
                  </div>
                ))}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Annuler</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-50">
                    {submitting ? 'Création…' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Confirm delete */}
        {deleteTarget && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setDeleteTarget(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-600" /></div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Supprimer {deleteTarget.name} ?</h2>
              <p className="text-sm text-gray-500 mb-5">Cette action est irréversible.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold">Annuler</button>
                <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Supprimer</button>
              </div>
            </div>
          </>
        )}
      </div>
    </ManagerLayout>
  );
}
