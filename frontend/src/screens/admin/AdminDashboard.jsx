import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { AdminLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';
import { Search } from 'lucide-react';

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
const STATUS_LABEL = { parking:'Stationnement', parked:'Stationné', requested:'🔔 Récupération', accepted:'Acceptée', returning:'En retour', arrived:'Arrivé', done:'Terminé' };

function buildHourlyChart(missions) {
  const hours = {};
  for (let h = 6; h <= 22; h++) hours[h] = 0;
  missions.forEach(m => { const h = new Date(m.createdAt).getHours(); if (h >= 6 && h <= 22) hours[h]++; });
  return Object.entries(hours).map(([h, count]) => ({ heure: `${h}h`, count }));
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [missions,  setMissions]  = useState([]);
  const [managers,  setManagers]  = useState([]);
  const [valets,    setValets]    = useState([]);
  const [search,    setSearch]    = useState('');
  const [sortCol,   setSortCol]   = useState('createdAt');
  const [sortDir,   setSortDir]   = useState('desc');
  const { toasts, addToast, removeToast, requestPermission } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => { requestPermission(); load(); }, []);

  async function load() {
    try {
      const [{ missions: ms }, { managers: mgrs }, { users: vs }] = await Promise.all([
        api.getMissions(),
        apiFetch('/api/managers'),
        apiFetch('/api/users?all=true'),
      ]);
      setMissions(ms || []);
      setManagers(mgrs || []);
      setValets(vs || []);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    mission_created: ({ mission }) => { setMissions(p => [mission, ...p]); addToast({ type:'accepted', title:'Nouvelle mission', body: mission.vehicle.marque }); },
    mission_updated: ({ mission }) => setMissions(p => p.map(m => m.id === mission.id ? mission : m)),
    mission_done:    ({ mission }) => setMissions(p => p.map(m => m.id === mission.id ? { ...m, status:'done' } : m)),
  });

  const active = missions.filter(m => m.status !== 'done');
  const done   = missions.filter(m => m.status === 'done');
  const today  = new Date().toDateString();
  const todayMissions = missions.filter(m => new Date(m.createdAt).toDateString() === today);

  const chartData = useMemo(() => buildHourlyChart(todayMissions), [todayMissions]);

  const pieData = [
    { name: 'Stationnés',  value: active.filter(m => m.status === 'parked').length,   fill: '#10b981' },
    { name: 'En retour',   value: active.filter(m => m.status === 'returning').length, fill: '#3b82f6' },
    { name: 'Terminées',   value: done.length,                                          fill: '#9ca3af' },
  ].filter(d => d.value > 0);

  // Stats par manager
  const statsByManager = useMemo(() => managers.map(mgr => {
    const mgrValets  = valets.filter(v => v.managerId === mgr.id);
    const mgrMissions = missions.filter(m => mgrValets.some(v => v.id === m.valetId || v.id === m.acceptedBy));
    return { ...mgr, valetCount: mgrValets.length, missionCount: mgrMissions.length, activeCount: mgrMissions.filter(m => m.status !== 'done').length };
  }), [managers, valets, missions]);

  // Table missions filtrée + triée
  const tableData = useMemo(() => {
    let ms = [...missions];
    if (search) ms = ms.filter(m =>
      m.ticket.toLowerCase().includes(search.toLowerCase()) ||
      m.vehicle.marque.toLowerCase().includes(search.toLowerCase()) ||
      m.valetName.toLowerCase().includes(search.toLowerCase())
    );
    ms.sort((a, b) => {
      let va = a[sortCol] || '', vb = b[sortCol] || '';
      if (sortCol === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return ms.slice(0, 50);
  }, [missions, search, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  return (
    <AdminLayout>
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Global</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs text-gray-500">Données en temps réel</p>
            </div>
          </div>
          <button onClick={load} className="text-sm text-emerald-600 font-semibold hover:underline">↻ Actualiser</button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Missions aujourd\'hui', value: todayMissions.length, icon: '🚗', color: 'from-blue-500 to-blue-600' },
            { label: 'Véhicules stationnés',  value: active.filter(m=>m.status==='parked').length, icon: '🅿️', color: 'from-emerald-500 to-green-600' },
            { label: 'En retour',             value: active.filter(m=>m.status==='returning').length, icon: '🔄', color: 'from-amber-500 to-orange-500' },
            { label: 'Voituriers actifs',     value: valets.filter(v=>v.status==='online').length, icon: '👤', color: 'from-violet-500 to-purple-600' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-14 h-14 bg-gradient-to-br ${color} rounded-bl-3xl opacity-10`} />
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Graphiques */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">📈 Missions par heure (aujourd'hui)</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="heure" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} formatter={v => [v, 'Missions']} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.count > 0 ? '#10b981' : '#e5e7eb'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4">🥧 Répartition statuts</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* Stats par manager */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">👔 Statistiques par Manager</h3>
            <button onClick={() => navigate('/admin/managers')} className="text-xs text-emerald-600 font-semibold hover:underline">Voir tous →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Manager','Voituriers','Missions actives','Total missions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statsByManager.map(mgr => (
                  <tr key={mgr.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/managers/${mgr.id}`)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-xs font-bold text-violet-700">{mgr.avatar || mgr.name[0]}</div>
                        <span className="text-sm font-semibold text-gray-900">{mgr.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{mgr.valetCount}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${mgr.activeCount > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{mgr.activeCount}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-700">{mgr.missionCount}</td>
                  </tr>
                ))}
                {statsByManager.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">Aucun manager</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Toutes les missions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900">Toutes les missions · {missions.length}</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Ticket, véhicule, voiturier…"
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-52" />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[['ticket','Ticket'],['valetName','Voiturier'],['vehicle','Véhicule'],['status','Statut'],['createdAt','Heure']].map(([col,label]) => (
                    <th key={col} onClick={() => toggleSort(col)}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600">
                      {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Aucune mission</td></tr>}
                {tableData.map(m => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-gray-900">{m.ticket}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{m.valetName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{m.vehicle.marque} · {m.vehicle.immatriculation}</td>
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
