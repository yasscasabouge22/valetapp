import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ManagerLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

const DATE_FILTERS = [
  { id: 'today',  label: "Aujourd'hui" },
  { id: 'yesterday', label: 'Hier' },
  { id: 'week',   label: 'Semaine' },
  { id: 'month',  label: 'Mois' },
];

const STATUS_CFG = {
  parking:   { label: 'Stationnement', color: 'bg-amber-100 text-amber-700' },
  parked:    { label: 'Stationné',     color: 'bg-emerald-100 text-emerald-700' },
  requested: { label: '🔔 Récupération', color: 'bg-red-100 text-red-700' },
  accepted:  { label: 'Acceptée',      color: 'bg-violet-100 text-violet-700' },
  returning: { label: 'En retour',     color: 'bg-blue-100 text-blue-700' },
  arrived:   { label: 'Arrivé',        color: 'bg-emerald-100 text-emerald-700' },
  done:      { label: 'Terminé',       color: 'bg-gray-100 text-gray-500' },
};

function inPeriod(dateStr, filter) {
  const d = new Date(dateStr);
  const now = new Date();
  if (filter === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (filter === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  if (filter === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0);
    return d >= start;
  }
  if (filter === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  return true;
}

function buildHourlyChart(missions) {
  const hours = {};
  for (let h = 6; h <= 22; h++) hours[h] = 0;
  missions.forEach(m => {
    const h = new Date(m.createdAt).getHours();
    if (h >= 6 && h <= 22) hours[h]++;
  });
  return Object.entries(hours).map(([h, count]) => ({ heure: `${h}h`, count }));
}

function avgMinutes(missions) {
  const done = missions.filter(m => m.status === 'done' && m.requestedAt && m.arrivedAt);
  if (!done.length) return null;
  const avg = done.reduce((s, m) => s + (new Date(m.arrivedAt) - new Date(m.requestedAt)), 0) / done.length;
  return Math.round(avg / 60000);
}

export function ManagerDashboard() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [filter, setFilter]   = useState('today');
  const [allMissions, setAll] = useState([]);
  const [valets, setValets]   = useState([]);
  const [search, setSearch]   = useState('');
  const [sortCol, setSortCol] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const { toasts, addToast, removeToast, requestPermission } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => { requestPermission(); load(); }, []);

  async function load() {
    try {
      const [{ missions }, { users: vs }] = await Promise.all([
        api.getMissions(),
        apiFetch('/api/users'),
      ]);
      setAll(missions || []);
      setValets(vs || []);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    mission_created: ({ mission }) => { setAll(p => [mission, ...p]); addToast({ type: 'accepted', title: 'Nouvelle mission', body: `${mission.vehicle.marque} · ${mission.ticket}` }); },
    mission_updated: ({ mission }) => setAll(p => p.map(m => m.id === mission.id ? mission : m)),
    mission_done:    ({ mission }) => setAll(p => p.map(m => m.id === mission.id ? { ...m, status: 'done' } : m)),
  });

  // Filtre temporel
  const filtered = useMemo(() => allMissions.filter(m => inPeriod(m.createdAt, filter)), [allMissions, filter]);

  // KPIs
  const kpis = useMemo(() => ({
    total:      filtered.length,
    parked:     filtered.filter(m => m.status === 'parked').length,
    returning:  filtered.filter(m => m.status === 'returning').length,
    requested:  filtered.filter(m => m.status === 'requested').length,
    done:       filtered.filter(m => m.status === 'done').length,
    online:     valets.filter(v => v.status === 'online').length,
    avgMin:     avgMinutes(filtered),
  }), [filtered, valets]);

  // Graphique missions par heure
  const chartData = useMemo(() => buildHourlyChart(filtered), [filtered]);

  // Table avec tri + recherche
  const tableData = useMemo(() => {
    let ms = [...filtered];
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
    return ms;
  }, [filtered, search, sortCol, sortDir]);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  return (
    <ManagerLayout>
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">

        {/* Header + filtre date */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-MA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
          <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl flex-wrap">
            {DATE_FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.id ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Missions',         value: kpis.total,    sub: 'sur la période',  color: 'from-blue-500 to-blue-600',    icon: '🚗' },
            { label: 'Stationnés',       value: kpis.parked,   sub: 'en ce moment',    color: 'from-emerald-500 to-green-600',icon: '🅿️' },
            { label: 'En retour',        value: kpis.returning,sub: 'en cours',         color: 'from-amber-500 to-orange-500', icon: '🔄' },
            { label: 'Voituriers actifs',value: kpis.online,   sub: `/${valets.length} connectés`, color: 'from-violet-500 to-purple-600', icon: '👤' },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 overflow-hidden relative">
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br ${color} rounded-bl-3xl opacity-10`} />
              <div className="text-2xl mb-1">{icon}</div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* KPIs secondaires */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Terminées',      value: kpis.done,                    icon: '✅', color: 'text-emerald-600' },
            { label: 'Récupérations',  value: kpis.requested,               icon: '🔔', color: kpis.requested > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Temps moyen',    value: kpis.avgMin ? `${kpis.avgMin} min` : '—', icon: '⏱️', color: 'text-blue-600' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className="text-xl">{icon}</p>
              <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Graphique missions par heure */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">📈 Missions par heure</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="heure" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v) => [v, 'Missions']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.count > 0 ? '#10b981' : '#e5e7eb'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Voituriers en ligne */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">👥 Voituriers en ligne <span className="text-emerald-600 ml-1">{kpis.online}</span></h3>
            <button onClick={() => navigate('/manager/voituriers')} className="text-xs text-emerald-600 font-semibold hover:underline">Gérer l'équipe →</button>
          </div>
          <div className="flex gap-3 p-4 overflow-x-auto">
            {valets.length === 0 && <p className="text-sm text-gray-400">Aucun voiturier</p>}
            {valets.map(v => {
              const myMissions = allMissions.filter(m => (m.valetId === v.id || m.acceptedBy === v.id) && m.status !== 'done');
              return (
                <button key={v.id} onClick={() => navigate(`/manager/voituriers/${v.id}`)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-colors min-w-[70px]">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${v.blocked ? 'bg-red-100 text-red-600' : v.status === 'online' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.avatar}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${v.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  </div>
                  <p className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{v.name.split(' ')[0]}</p>
                  {myMissions.length > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">{myMissions.length}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table des missions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-gray-900">Missions · {tableData.length}</h3>
            <div className="flex items-center gap-2">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher ticket, véhicule, voiturier…"
                className="pl-3 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 w-48" />
              <button onClick={load} className="text-xs text-emerald-600 font-semibold hover:underline">↻</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {[['ticket','Ticket'],['valetName','Voiturier'],['vehicle','Véhicule'],['status','Statut'],['createdAt','Heure']].map(([col, label]) => (
                    <th key={col} onClick={() => toggleSort(col)}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 select-none">
                      {label}<SortIcon col={col} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">Aucune mission sur cette période</td></tr>}
                {tableData.map(m => {
                  const cfg = STATUS_CFG[m.status] || STATUS_CFG.parking;
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => navigate(`/manager/voituriers/${m.valetId}`)}>
                      <td className="px-5 py-3 text-sm font-bold text-gray-900">{m.ticket}</td>
                      <td className="px-5 py-3 text-sm text-gray-700">{m.valetName}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{m.vehicle.marque} · {m.vehicle.immatriculation}</td>
                      <td className="px-5 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="px-5 py-3 text-xs text-gray-400">{new Date(m.createdAt).toLocaleTimeString('fr-MA',{hour:'2-digit',minute:'2-digit'})}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
