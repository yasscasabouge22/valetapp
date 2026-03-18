import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit2, Ban, Trash2, ChevronRight, Loader2, Eye } from 'lucide-react';
import { AdminLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

// ─── Liste des managers ───────────────────────────────────────
export function AdminManagers() {
  const navigate = useNavigate();
  const [managers, setManagers] = useState([]);
  const [valets,   setValets]   = useState([]);
  const [search,   setSearch]   = useState('');
  const [showAdd,  setShowAdd]  = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showDelete, setShowDelete] = useState(null);
  const [form,     setForm]     = useState({ name:'', email:'', password:'mgr123', phone:'' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [{ managers: mgrs }, { users: vs }] = await Promise.all([
        apiFetch('/api/managers'),
        apiFetch('/api/users?all=true'),
      ]);
      setManagers(mgrs || []);
      setValets(vs || []);
    } catch {}
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search) return managers;
    return managers.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || (m.email || '').toLowerCase().includes(search.toLowerCase()));
  }, [managers, search]);

  const getValetCount = (mgrId) => valets.filter(v => v.managerId === mgrId).length;

  const handleAdd = async (e) => {
    e.preventDefault(); setError('');
    const res = await apiFetch('/api/managers', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    if (res.error) { setError(res.error); return; }
    setManagers(p => [...p, res.manager]);
    setShowAdd(false); setForm({ name:'', email:'', password:'mgr123', phone:'' });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    await apiFetch(`/api/users/${showEdit.id}`, { method: 'PATCH', body: JSON.stringify({ name: showEdit.name, phone: showEdit.phone, email: showEdit.email }) });
    setManagers(p => p.map(m => m.id === showEdit.id ? { ...m, ...showEdit } : m));
    setShowEdit(null);
  };

  const handleToggleBlock = async (m) => {
    await apiFetch(`/api/users/${m.id}`, { method: 'PATCH', body: JSON.stringify({ blocked: !m.blocked }) });
    setManagers(p => p.map(x => x.id === m.id ? { ...x, blocked: !x.blocked } : x));
  };

  const handleDelete = async (m) => {
    await apiFetch(`/api/users/${m.id}`, { method: 'DELETE' });
    setManagers(p => p.filter(x => x.id !== m.id));
    setShowDelete(null);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-5xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Managers</h1>
            <p className="text-sm text-gray-500">{managers.length} manager{managers.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
            <Plus className="w-4 h-4" />Ajouter un manager
          </button>
        </div>

        {/* Recherche */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Manager','Email','Téléphone','Voituriers','Statut','Actions'].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">Aucun manager</td></tr>}
                {filtered.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${m.blocked ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-700'}`}>{m.avatar || m.name[0]}</div>
                        <span className="text-sm font-semibold text-gray-900">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-sm text-gray-600">{m.email || '—'}</td>
                    <td className="px-3 py-3.5 text-sm text-gray-600">{m.phone || '—'}</td>
                    <td className="px-3 py-3.5 text-sm font-bold text-gray-900 text-center">{getValetCount(m.id)}</td>
                    <td className="px-3 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.blocked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {m.blocked ? 'Bloqué' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/admin/managers/${m.id}`)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100" title="Voir la fiche"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowEdit({ ...m })} className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-50 text-gray-500 hover:bg-gray-100" title="Modifier"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleToggleBlock(m)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${m.blocked ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`} title={m.blocked?'Débloquer':'Bloquer'}><Ban className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowDelete(m)} className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal ajouter */}
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Créer</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal modifier */}
      {showEdit && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowEdit(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Modifier {showEdit.name}</h2>
            <form onSubmit={handleEdit} className="space-y-4">
              {[['name','Nom'],['email','Email'],['phone','Téléphone']].map(([k,l]) => (
                <div key={k}>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1.5">{l}</label>
                  <input type="text" value={showEdit[k] || ''} onChange={e => setShowEdit({...showEdit,[k]:e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEdit(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Enregistrer</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Modal supprimer */}
      {showDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDelete(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-600" /></div>
            <h2 className="text-lg font-bold mb-1">Supprimer {showDelete.name} ?</h2>
            <p className="text-sm text-gray-500 mb-5">Action irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(null)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold">Annuler</button>
              <button onClick={() => handleDelete(showDelete)} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold">Supprimer</button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

// ─── Fiche Manager ────────────────────────────────────────────
export function AdminManagerDetail() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [manager, setManager] = useState(null);
  const [valets,  setValets]  = useState([]);
  const [missions,setMissions]= useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const [{ managers }, { users: vs }, { missions: ms }] = await Promise.all([
        apiFetch('/api/managers'),
        apiFetch('/api/users?all=true'),
        api.getMissions(),
      ]);
      setManager((managers || []).find(m => m.id === id));
      setValets((vs || []).filter(v => v.managerId === id));
      setMissions(ms || []);
    } catch {}
    setLoading(false);
  }

  if (loading) return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div></AdminLayout>;
  if (!manager) return <AdminLayout><div className="p-6 text-center text-gray-500">Manager non trouvé</div></AdminLayout>;

  const mgrMissions = missions.filter(m => valets.some(v => v.id === m.valetId || v.id === m.acceptedBy));

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-3xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/managers')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="text-xl font-bold text-gray-900">Fiche Manager</h1>
        </div>

        {/* Profil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold">{manager.avatar || manager.name[0]}</div>
            <div>
              <h2 className="text-xl font-bold">{manager.name}</h2>
              <p className="text-white/70 text-sm">{manager.email}</p>
              <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${manager.blocked ? 'bg-red-400/20 text-red-200' : 'bg-white/20 text-white'}`}>
                {manager.blocked ? '🚫 Bloqué' : '✅ Actif'}
              </span>
            </div>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4 text-sm">
            {[['Téléphone', manager.phone || '—'],['Email', manager.email || '—']].map(([l,v]) => (
              <div key={l}>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">{l}</p>
                <p className="text-gray-900 font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Voituriers', value: valets.length, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Missions actives', value: mgrMissions.filter(m => m.status !== 'done').length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total missions', value: mgrMissions.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Liste des voituriers de ce manager */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Voituriers gérés <span className="text-violet-600 ml-1">{valets.length}</span></h3>
            <button onClick={() => navigate('/admin/voituriers')} className="text-xs text-emerald-600 font-semibold hover:underline">Voir tous →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {valets.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Aucun voiturier assigné à ce manager</p>}
            {valets.map(v => (
              <div key={v.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/voituriers/${v.id}`)}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{v.avatar}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.phone} · {v.matricule || 'Sans matricule'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {v.blocked ? 'Bloqué' : v.status === 'online' ? 'En ligne' : 'Hors ligne'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
