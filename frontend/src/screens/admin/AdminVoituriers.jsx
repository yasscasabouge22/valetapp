import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Search, Edit2, Ban, Trash2, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { AdminLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

const STATUS_CFG = {
  parking:'bg-amber-100 text-amber-700', parked:'bg-emerald-100 text-emerald-700',
  requested:'bg-red-100 text-red-700', accepted:'bg-violet-100 text-violet-700',
  returning:'bg-blue-100 text-blue-700', arrived:'bg-emerald-100 text-emerald-700', done:'bg-gray-100 text-gray-500',
};
const STATUS_LABEL = { parking:'Stationnement', parked:'Stationné', requested:'Récupération', accepted:'Acceptée', returning:'En retour', arrived:'Arrivé', done:'Terminé' };

// ─── Liste globale voituriers ─────────────────────────────────
export function AdminVoituriers() {
  const navigate = useNavigate();
  const [valets,   setValets]   = useState([]);
  const [managers, setManagers] = useState([]);
  const [search,   setSearch]   = useState('');
  const [filterMgr, setFilterMgr] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ users: vs }, { managers: mgrs }] = await Promise.all([
        apiFetch('/api/users?all=true'),
        apiFetch('/api/managers'),
      ]);
      setValets(vs || []);
      setManagers(mgrs || []);
    } catch {}
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let vs = [...valets];
    if (search) vs = vs.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search) || (v.matricule || '').includes(search));
    if (filterMgr !== 'all') vs = vs.filter(v => v.managerId === filterMgr);
    if (filterStatus === 'online')  vs = vs.filter(v => v.status === 'online' && !v.blocked);
    if (filterStatus === 'offline') vs = vs.filter(v => v.status === 'offline' && !v.blocked);
    if (filterStatus === 'blocked') vs = vs.filter(v => v.blocked);
    return vs;
  }, [valets, search, filterMgr, filterStatus]);

  const getMgrName = (id) => managers.find(m => m.id === id)?.name || '—';

  const handleToggleBlock = async (v) => {
    await apiFetch(`/api/users/${v.id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !v.blocked }) });
    setValets(p => p.map(x => x.id === v.id ? { ...x, blocked: !x.blocked } : x));
  };

  const handleDelete = async (v) => {
    if (!confirm(`Supprimer ${v.name} ? Action irréversible.`)) return;
    await apiFetch(`/api/users/${v.id}`, { method: 'DELETE' });
    setValets(p => p.filter(x => x.id !== v.id));
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tous les voituriers</h1>
          <p className="text-sm text-gray-500">{valets.length} voiturier{valets.length > 1 ? 's' : ''} au total</p>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, téléphone ou matricule…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <select value={filterMgr} onChange={e => setFilterMgr(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 bg-white">
            <option value="all">Tous les managers</option>
            {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="flex gap-2">
            {[['all','Tous'],['online','En ligne'],['offline','Hors ligne'],['blocked','Bloqués']].map(([v,l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filterStatus===v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Voiturier','Matricule','Téléphone','Manager','Statut','Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Aucun voiturier trouvé</td></tr>}
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/admin/voituriers/${v.id}`)}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.avatar}</div>
                        <span className="text-sm font-semibold text-gray-900 hover:text-emerald-600">{v.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{v.matricule || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{v.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 hidden md:table-cell">{getMgrName(v.managerId)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {v.blocked ? 'Bloqué' : v.status === 'online' ? 'En ligne' : 'Hors ligne'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/voituriers/${v.id}`)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100"><ChevronRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleToggleBlock(v)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${v.blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}><Ban className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(v)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Fiche détaillée Voiturier (Admin) ───────────────────────
export function AdminValetDetail() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const [valet,    setValet]    = useState(null);
  const [missions, setMissions] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [newMgrId, setNewMgrId] = useState('');

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [{ users: vs }, { missions: ms }, { managers: mgrs }] = await Promise.all([
        apiFetch('/api/users?all=true'),
        api.getMissions(),
        apiFetch('/api/managers'),
      ]);
      const v = (vs || []).find(u => u.id === id);
      if (v) { setValet(v); setEditForm({ name: v.name, phone: v.phone }); }
      setMissions(ms || []);
      setManagers(mgrs || []);
    } catch {}
    setLoading(false);
  }

  const myMissions = missions.filter(m => m.valetId === id || m.acceptedBy === id);
  const today = new Date().toDateString();
  const todayMissions = myMissions.filter(m => new Date(m.createdAt).toDateString() === today);

  const perfChart = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i));
    return { label: d.toLocaleDateString('fr-MA',{weekday:'short'}), count: myMissions.filter(m => new Date(m.createdAt).toDateString() === d.toDateString()).length };
  }), [myMissions]);

  const getMgrName = (mgrId) => managers.find(m => m.id === mgrId)?.name || '—';

  const handleEdit = async (e) => {
    e.preventDefault();
    await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    setValet(v => ({ ...v, ...editForm }));
    setShowEdit(false);
  };

  const handleReassign = async () => {
    if (!newMgrId) return;
    await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ managerId: newMgrId }) });
    setValet(v => ({ ...v, managerId: newMgrId }));
    setShowReassign(false);
  };

  const handleToggleBlock = async () => {
    await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !valet.blocked }) });
    setValet(v => ({ ...v, blocked: !v.blocked }));
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce voiturier ? Action irréversible.')) return;
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    navigate('/admin/voituriers');
  };

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div></AdminLayout>;
  if (!valet)  return <AdminLayout><div className="p-6 text-center text-gray-500">Voiturier non trouvé</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/voituriers')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-xl font-bold text-gray-900">Fiche voiturier</h1>
        </div>

        {/* Profil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${valet.blocked ? 'bg-red-400/30' : 'bg-white/10'}`}>{valet.avatar}</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{valet.name}</h2>
              <p className="text-white/60 text-sm font-mono">{valet.matricule || 'Sans matricule'}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${valet.blocked ? 'bg-red-400/20 text-red-300' : valet.status === 'online' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                  {valet.blocked ? '🚫 Bloqué' : valet.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white/70">
                  Manager : {getMgrName(valet.managerId)}
                </span>
              </div>
            </div>
          </div>
          <div className="p-5 space-y-2.5 text-sm">
            {[['Téléphone', valet.phone],['Email', valet.email || '—'],['Manager assigné', getMgrName(valet.managerId)]].map(([l,v]) => (
              <div key={l} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{l}</span>
                <span className="text-gray-900 font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:"Aujourd'hui", value: todayMissions.length, color:'text-blue-600', bg:'bg-blue-50' },
            { label:'Total',       value: myMissions.length,    color:'text-emerald-600', bg:'bg-emerald-50' },
            { label:'Terminées',   value: myMissions.filter(m=>m.status==='done').length, color:'text-gray-700', bg:'bg-gray-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Graphique perf */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📈 Performance — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={perfChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', fontSize: 11 }} />
              <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Historique */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Historique complet <span className="text-gray-400 ml-1 font-normal">({myMissions.length})</span></h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {myMissions.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune mission</p>}
            {myMissions.slice(0,30).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-sm shrink-0">🚗</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{m.ticket} · {m.vehicle.marque} · {m.vehicle.immatriculation}</p>
                  <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('fr-MA',{day:'2-digit',month:'short',year:'numeric'})}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${STATUS_CFG[m.status] || 'bg-gray-100'}`}>{STATUS_LABEL[m.status] || m.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowEdit(true)} className="flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100">
            <Edit2 className="w-4 h-4" />Modifier
          </button>
          <button onClick={() => setShowReassign(true)} className="flex items-center justify-center gap-2 py-3 bg-violet-50 border border-violet-200 text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-100">
            <RefreshCw className="w-4 h-4" />Réaffecter manager
          </button>
          <button onClick={handleToggleBlock} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border ${valet.blocked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
            <Ban className="w-4 h-4" />{valet.blocked ? 'Débloquer' : 'Bloquer'}
          </button>
          <button onClick={handleDelete} className="flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100">
            <Trash2 className="w-4 h-4" />Supprimer
          </button>
        </div>
      </div>

      {/* Modal modifier */}
      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowEdit(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Modifier {valet.name}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              {[['name','Nom complet'],['phone','Téléphone']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{l}</label>
                  <input type="text" value={editForm[k] || ''} onChange={e => setEditForm({...editForm,[k]:e.target.value})} required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
              <p className="text-xs text-gray-400">Matricule : <strong>{valet.matricule}</strong> (non modifiable)</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold">Enregistrer</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal réaffecter */}
      {showReassign && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowReassign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Réaffecter le manager</h2>
            <p className="text-sm text-gray-500 mb-5">Manager actuel : <strong>{getMgrName(valet.managerId)}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nouveau manager</label>
                <select value={newMgrId} onChange={e => setNewMgrId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Sélectionner un manager…</option>
                  {managers.filter(m => m.id !== valet.managerId).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowReassign(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                <button onClick={handleReassign} disabled={!newMgrId} className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">Réaffecter</button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
