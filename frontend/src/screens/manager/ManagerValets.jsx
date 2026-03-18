import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowLeft, Plus, Search, Phone, Edit2, Ban, Trash2, ChevronRight, Check, X, Loader2 } from 'lucide-react';
import { ManagerLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

const STATUS_CFG = {
  parking:'bg-amber-100 text-amber-700', parked:'bg-emerald-100 text-emerald-700',
  requested:'bg-red-100 text-red-700', accepted:'bg-violet-100 text-violet-700',
  returning:'bg-blue-100 text-blue-700', arrived:'bg-emerald-100 text-emerald-700',
  done:'bg-gray-100 text-gray-500',
};
const STATUS_LABEL = { parking:'Stationnement', parked:'Stationné', requested:'🔔 Récupération', accepted:'Acceptée', returning:'En retour', arrived:'Arrivé', done:'Terminé' };

// ─── Liste Voituriers ─────────────────────────────────────────
export function ManagerValets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [valets, setValets] = useState([]);
  const [missions, setMissions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ users: vs }, { missions: ms }] = await Promise.all([
        apiFetch('/api/users'),
        api.getMissions(),
      ]);
      setValets(vs || []);
      setMissions(ms || []);
    } catch {}
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let vs = [...valets];
    if (search) vs = vs.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search));
    if (filterStatus !== 'all') vs = vs.filter(v => filterStatus === 'blocked' ? v.blocked : filterStatus === 'online' ? v.status === 'online' : v.status === 'offline');
    return vs;
  }, [valets, search, filterStatus]);

  const getMissionsToday = (valetId) => {
    const today = new Date().toDateString();
    return missions.filter(m => (m.valetId === valetId || m.acceptedBy === valetId) && new Date(m.createdAt).toDateString() === today).length;
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-4xl">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mon équipe</h1>
            <p className="text-sm text-gray-500">{valets.length} voiturier{valets.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => navigate('/manager/ajout-voiturier')}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />Ajouter un voiturier
          </button>
        </div>

        {/* Recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou téléphone…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="flex gap-2">
            {[['all','Tous'],['online','En ligne'],['offline','Hors ligne'],['blocked','Bloqués']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${filterStatus===v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Voiturier','Matricule','Téléphone','Statut','Missions auj.','Performance',''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider first:pl-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Aucun voiturier trouvé</td></tr>}
                {filtered.map(v => {
                  const todayCount = getMissionsToday(v.id);
                  const totalMissions = missions.filter(m => m.valetId === v.id || m.acceptedBy === v.id).length;
                  return (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/manager/voituriers/${v.id}`)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.avatar}</div>
                          <span className="text-sm font-semibold text-gray-900">{v.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-gray-500">{v.matricule || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600">{v.phone}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.blocked ? 'Bloqué' : v.status === 'online' ? 'En ligne' : 'Hors ligne'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-900 text-center">{todayCount}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, totalMissions * 10)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{totalMissions}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal réaffecter missions */}
      {showReassign && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowReassign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Réaffecter les missions</h2>
            <p className="text-sm text-gray-500 mb-4">Transférer les missions actives de <strong>{valet.name}</strong> vers un autre voiturier.</p>
            {myMissions.filter(m => m.status !== 'done').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune mission active à réaffecter.</p>
            ) : (
              <div className="space-y-3 mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nouveau voiturier</label>
                <select value={newValetId} onChange={e => setNewValetId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Sélectionner un voiturier…</option>
                  {allValets.map(v => <option key={v.id} value={v.id}>{v.name} — {v.matricule || v.phone}</option>)}
                </select>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myMissions.filter(m => m.status !== 'done').map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{m.ticket} · {m.vehicle?.marque}</span>
                      <button onClick={() => handleReassign(m.id)} disabled={!newValetId}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-purple-700">
                        Réaffecter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowReassign(false)} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </>
      )}
    </ManagerLayout>
  );
}

// ─── Ajout Voiturier ─────────────────────────────────────────
export function ManagerAjoutVoiturier() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ nom: '', prenom: '', phone: '', email: '', adresse: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: `${form.nom} ${form.prenom}`.trim(),
          phone: form.phone,
          email: form.email,
          adresse: form.adresse,
          notes: form.notes,
          managerId: user?.id,
        }),
      });
      if (res.error) throw new Error(res.error);
      navigate(`/manager/voituriers/${res.user.id}`);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <ManagerLayout>
      <div className="p-4 md:p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/manager/voituriers')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ajouter un voiturier</h1>
            <p className="text-sm text-gray-500">Le matricule sera généré automatiquement</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations obligatoires</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['nom','Nom *','Alami',true],['prenom','Prénom *','Mohammed',true]].map(([k,l,p,req]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">{l}</label>
                  <input type="text" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
                    placeholder={p} required={req}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Téléphone * <span className="text-gray-400 font-normal">(unique)</span></label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={form.phone} onChange={e => setForm({...form,phone:e.target.value})}
                  placeholder="+212 6 XX XX XX XX" required
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations optionnelles</h3>
            {[
              ['email','Email','ahmed@example.com','email'],
              ['adresse','Adresse','123 Rue Mohammed V, Casablanca','text'],
            ].map(([k,l,p,t]) => (
              <div key={k}>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">{l}</label>
                <input type={t} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} placeholder={p}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={3}
                placeholder="Informations complémentaires…"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all resize-none" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
            Le matricule sera automatiquement généré au format <strong>V-{new Date().getFullYear()}-XXX</strong>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/manager/voituriers')}
              className="flex-1 py-3.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Création…</> : 'Créer le voiturier'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal réaffecter missions */}
      {showReassign && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowReassign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Réaffecter les missions</h2>
            <p className="text-sm text-gray-500 mb-4">Transférer les missions actives de <strong>{valet.name}</strong> vers un autre voiturier.</p>
            {myMissions.filter(m => m.status !== 'done').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune mission active à réaffecter.</p>
            ) : (
              <div className="space-y-3 mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nouveau voiturier</label>
                <select value={newValetId} onChange={e => setNewValetId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Sélectionner un voiturier…</option>
                  {allValets.map(v => <option key={v.id} value={v.id}>{v.name} — {v.matricule || v.phone}</option>)}
                </select>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myMissions.filter(m => m.status !== 'done').map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{m.ticket} · {m.vehicle?.marque}</span>
                      <button onClick={() => handleReassign(m.id)} disabled={!newValetId}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-purple-700">
                        Réaffecter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowReassign(false)} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </>
      )}
    </ManagerLayout>
  );
}

// ─── Fiche Voiturier ─────────────────────────────────────────
export function ManagerValetDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [valet, setValet]       = useState(null);
  const [missions, setMissions] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [newValetId, setNewValetId] = useState('');
  const [allValets, setAllValets] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [{ users: vs }, { missions: ms }] = await Promise.all([
        apiFetch('/api/users'),
        api.getMissions(),
      ]);
      const v = (vs || []).find(u => u.id === id);
      if (v) { setValet(v); setEditForm({ name: v.name, phone: v.phone, email: v.email||'', adresse: v.adresse||'', notes: v.notes||'' }); }
      setMissions(ms || []);
    } catch {}
    setLoading(false);
  }

  const myMissions = missions.filter(m => m.valetId === id || m.acceptedBy === id);
  const today = new Date().toDateString();
  const todayMissions = myMissions.filter(m => new Date(m.createdAt).toDateString() === today);
  const doneMissions  = myMissions.filter(m => m.status === 'done');

  // Graphique perf 7 derniers jours
  const perfChart = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6-i));
      const label = d.toLocaleDateString('fr-MA', { weekday: 'short' });
      const count = myMissions.filter(m => new Date(m.createdAt).toDateString() === d.toDateString()).length;
      return { label, count };
    });
  }, [myMissions]);

  const handleEdit = async (e) => {
    e.preventDefault();
    await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(editForm) });
    setValet(v => ({ ...v, ...editForm }));
    setShowEdit(false);
  };

  const handleBlock = async () => {
    await apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !valet.blocked }) });
    setValet(v => ({ ...v, blocked: !v.blocked }));
    setShowBlock(false);
  };

  const handleDelete = async () => {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
    navigate('/manager/voituriers');
  };

  const handleReassign = async (missionId) => {
    if (!newValetId) return;
    await apiFetch(`/api/missions/${missionId}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ newValetId }),
    });
    await load();
    setShowReassign(false);
    setNewValetId('');
  };

  const openReassign = async () => {
    const { users: vs } = await apiFetch('/api/users');
    setAllValets((vs || []).filter(v => v.id !== id));
    setShowReassign(true);
  };

  if (loading) return <ManagerLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div></ManagerLayout>;
  if (!valet)  return <ManagerLayout><div className="p-6 text-center text-gray-500">Voiturier non trouvé</div></ManagerLayout>;

  return (
    <ManagerLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/manager/voituriers')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Fiche voiturier</h1>
        </div>

        {/* Profil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 text-white flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold ${valet.blocked ? 'bg-red-400/30' : 'bg-white/10'}`}>
              {valet.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{valet.name}</h2>
              <p className="text-white/60 text-sm font-mono">{valet.matricule || 'Sans matricule'}</p>
              <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${valet.blocked ? 'bg-red-400/20 text-red-300' : valet.status === 'online' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/50'}`}>
                {valet.blocked ? '🚫 Bloqué' : valet.status === 'online' ? '🟢 En ligne' : '⚫ Hors ligne'}
              </span>
            </div>
          </div>
          <div className="p-5 space-y-3 text-sm">
            {[
              ['Téléphone', valet.phone],
              ['Email', valet.email || '—'],
              ['Adresse', valet.adresse || '—'],
              ['Notes', valet.notes || '—'],
            ].map(([l, v]) => (
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
            { label: "Aujourd'hui", value: todayMissions.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total',       value: myMissions.length,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Terminées',   value: doneMissions.length,  color: 'text-gray-700', bg: 'bg-gray-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Graphique performance 7 jours */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📈 Performances — 7 derniers jours</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={perfChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
              <Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Historique missions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Historique des missions</h3>
          </div>
          <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
            {myMissions.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucune mission</p>}
            {myMissions.slice(0, 20).map(m => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-sm">🚗</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{m.ticket} · {m.vehicle.marque}</p>
                  <p className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleDateString('fr-MA', { day:'2-digit', month:'short' })} à {new Date(m.createdAt).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_CFG[m.status] || 'bg-gray-100'}`}>{STATUS_LABEL[m.status] || m.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => setShowEdit(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100">
            <Edit2 className="w-4 h-4" />Modifier
          </button>
          <button onClick={() => setShowBlock(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-colors ${valet.blocked ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
            <Ban className="w-4 h-4" />{valet.blocked ? 'Débloquer' : 'Bloquer'}
          </button>
          <button onClick={openReassign} className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-100">
            <ArrowLeft className="w-4 h-4 rotate-180" />Réaffecter
          </button>
          <button onClick={() => setShowDelete(true)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold hover:bg-red-100">
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
              {[['name','Nom complet'],['phone','Téléphone'],['email','Email'],['adresse','Adresse']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{l}</label>
                  <input type="text" value={editForm[k] || ''} onChange={e => setEditForm({...editForm,[k]:e.target.value})} required={k==='name'||k==='phone'}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Notes</label>
                <textarea value={editForm.notes || ''} onChange={e => setEditForm({...editForm,notes:e.target.value})} rows={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 resize-none" />
              </div>
              <p className="text-xs text-gray-400">Le matricule <strong>{valet.matricule}</strong> ne peut pas être modifié.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal bloquer */}
      {showBlock && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowBlock(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6 text-center">
            <div className={`w-14 h-14 ${valet.blocked ? 'bg-emerald-100' : 'bg-orange-100'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <Ban className={`w-7 h-7 ${valet.blocked ? 'text-emerald-600' : 'text-orange-600'}`} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{valet.blocked ? 'Débloquer' : 'Bloquer'} {valet.name} ?</h2>
            <p className="text-sm text-gray-500 mb-5">
              {valet.blocked ? 'Le voiturier pourra à nouveau se connecter.' : 'Le voiturier ne pourra plus se connecter au système.'}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowBlock(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold">Annuler</button>
              <button onClick={handleBlock} className={`flex-1 py-3 text-white rounded-xl text-sm font-semibold ${valet.blocked ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                {valet.blocked ? 'Débloquer' : 'Bloquer'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal supprimer */}
      {showDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDelete(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Supprimer {valet.name} ?</h2>
            <p className="text-sm text-gray-500 mb-1">Cette action est <strong>irréversible</strong>.</p>
            <p className="text-xs text-gray-400 mb-5">L'historique des missions sera conservé pour traçabilité.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold">Annuler</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">Supprimer définitivement</button>
            </div>
          </div>
        </>
      )}

      {/* Modal réaffecter missions */}
      {showReassign && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowReassign(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Réaffecter les missions</h2>
            <p className="text-sm text-gray-500 mb-4">Transférer les missions actives de <strong>{valet.name}</strong> vers un autre voiturier.</p>
            {myMissions.filter(m => m.status !== 'done').length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune mission active à réaffecter.</p>
            ) : (
              <div className="space-y-3 mb-4">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Nouveau voiturier</label>
                <select value={newValetId} onChange={e => setNewValetId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500">
                  <option value="">Sélectionner un voiturier…</option>
                  {allValets.map(v => <option key={v.id} value={v.id}>{v.name} — {v.matricule || v.phone}</option>)}
                </select>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myMissions.filter(m => m.status !== 'done').map(m => (
                    <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                      <span className="text-sm font-medium text-gray-700">{m.ticket} · {m.vehicle?.marque}</span>
                      <button onClick={() => handleReassign(m.id)} disabled={!newValetId}
                        className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-purple-700">
                        Réaffecter
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => setShowReassign(false)} className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Fermer
            </button>
          </div>
        </>
      )}
    </ManagerLayout>
  );
}
