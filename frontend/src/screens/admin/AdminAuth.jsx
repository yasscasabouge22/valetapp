import { useState, useEffect } from 'react';
import { AdminLayout } from '../shared/Layout.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Save, Loader2, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

// Paramètres stockés en mémoire côté frontend (en production → base de données)
const DEFAULT_PARAMS = {
  lieu: { nom: 'Hôtel Royal Mansour', adresse: '123 Avenue Mohammed V, Casablanca', lat: '33.5731', lng: '-7.5898', telephone: '+212 5 22 XX XX XX' },
  service: { distanceAlerte: '50', intervalleGPS: '5', expirationOTP: '5', dureeSession: '24', capaciteParking: '150' },
  branding: { couleur: '#10b981', logo: '' },
};

// ─── Admin Login ──────────────────────────────────────────────
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
          <div className="w-16 h-16 bg-emerald-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl border border-emerald-500/30">🚗</div>
          <h1 className="text-2xl font-bold text-white">ValetApp</h1>
          <p className="text-gray-400 text-sm mt-1">Administration · Manager</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm transition-all" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 p-3 rounded-xl">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 disabled:opacity-50 transition-all text-sm shadow-lg shadow-emerald-900/30">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Connexion…</> : 'Se connecter →'}
          </button>
        </form>

        <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-gray-400 space-y-1.5">
          <p className="font-semibold text-gray-300 mb-2">Comptes de démonstration</p>
          <div className="space-y-1">
            {[['Admin', 'admin@valetapp.ma', 'admin123'],['Manager 1', 'ahmed@valetapp.ma', 'mgr123'],['Manager 2', 'laila@valetapp.ma', 'mgr123']].map(([r,e,p]) => (
              <button key={e} onClick={() => { setEmail(e); setPassword(p); }}
                className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
                <span className="text-gray-300 font-semibold w-20">{r}</span>
                <span className="font-mono text-emerald-400">{e}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Paramètres ─────────────────────────────────────────
export function AdminParametres() {
  const [params, setParams] = useState(DEFAULT_PARAMS);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState('');
  const [preview, setPreview] = useState(params.branding.couleur);

  const save = async (section) => {
    setSaving(true);
    // En local : juste simuler une sauvegarde
    await new Promise(r => setTimeout(r, 600));
    setSaved(section);
    setTimeout(() => setSaved(''), 2000);
    setSaving(false);
  };

  const set = (section, key, val) => setParams(p => ({ ...p, [section]: { ...p[section], [key]: val } }));

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Paramètres du service</h1>
          <p className="text-sm text-gray-500">Configuration globale de votre service voiturier</p>
        </div>

        {/* Informations du lieu */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">📍 Informations du lieu</h3>
          {[
            ['nom',      'Nom du lieu',         'Hôtel Royal Mansour'],
            ['adresse',  'Adresse complète',     '123 Avenue Mohammed V, Casablanca'],
            ['telephone','Téléphone du service', '+212 5 22 XX XX XX'],
          ].map(([k,l,p]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">{l}</label>
              <input type="text" value={params.lieu[k]} onChange={e => set('lieu', k, e.target.value)} placeholder={p}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            {[['lat','Latitude GPS','33.5731'],['lng','Longitude GPS','-7.5898']].map(([k,l,p]) => (
              <div key={k}>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5">{l}</label>
                <input type="text" value={params.lieu[k]} onChange={e => set('lieu', k, e.target.value)} placeholder={p}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            ))}
          </div>
          <button onClick={() => save('lieu')} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved==='lieu' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved === 'lieu' ? '✅ Enregistré !' : <><Save className="w-4 h-4" />Enregistrer</>}
          </button>
        </div>

        {/* Paramètres techniques */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">⚙️ Paramètres techniques</h3>
          {[
            ['distanceAlerte',  'Distance alerte arrivée (mètres)',      '50',   'Distance à laquelle le client est notifié'],
            ['intervalleGPS',   'Intervalle GPS (secondes)',              '5',    'Fréquence de mise à jour de la position'],
            ['expirationOTP',   'Expiration OTP (minutes)',               '5',    'Durée de validité du code SMS'],
            ['dureeSession',    'Durée session (heures)',                 '24',   'Durée avant reconnexion obligatoire'],
            ['capaciteParking', 'Capacité parking (places)',              '150',  'Nombre maximum de véhicules'],
          ].map(([k, l, p, hint]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 block mb-1">{l}</label>
              <input type="number" value={params.service[k]} onChange={e => set('service', k, e.target.value)} placeholder={p}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
              <p className="text-xs text-gray-400 mt-1">{hint}</p>
            </div>
          ))}
          <button onClick={() => save('service')} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved==='service' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved==='service' ? '✅ Enregistré !' : <><Save className="w-4 h-4" />Enregistrer</>}
          </button>
        </div>

        {/* Personnalisation branding */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">🎨 Personnalisation visuelle</h3>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Couleur principale</label>
            <div className="flex items-center gap-4">
              <input type="color" value={params.branding.couleur}
                onChange={e => { set('branding', 'couleur', e.target.value); setPreview(e.target.value); }}
                className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-0.5" />
              <div>
                <p className="text-sm font-bold text-gray-900">{params.branding.couleur}</p>
                <p className="text-xs text-gray-400">Défaut : #10b981 (vert émeraude)</p>
              </div>
              <div className="flex gap-2 ml-auto">
                {['#10b981','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#111827'].map(c => (
                  <button key={c} onClick={() => { set('branding','couleur',c); setPreview(c); }}
                    className="w-7 h-7 rounded-lg border-2 border-white shadow-sm hover:scale-110 transition-transform"
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            {/* Aperçu */}
            <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Aperçu :</p>
              <div className="flex items-center gap-3">
                <button style={{ background: preview }} className="px-4 py-2 rounded-xl text-white text-sm font-bold shadow-sm">Bouton principal</button>
                <span style={{ background: preview + '20', color: preview }} className="px-3 py-1 rounded-full text-xs font-bold">Badge statut</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 block mb-2">Logo du service</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-400 transition-colors cursor-pointer">
              <p className="text-3xl mb-2">🖼️</p>
              <p className="text-sm text-gray-500">Glissez votre logo ici</p>
              <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG · Max 2 Mo · 512×512px recommandé</p>
            </div>
          </div>

          <button onClick={() => save('branding')} disabled={saving}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved==='branding' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved==='branding' ? '✅ Enregistré !' : <><Save className="w-4 h-4" />Appliquer</>}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

// ─── Admin Profil ─────────────────────────────────────────────
export function AdminProfil() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch(`/api/users/${user?.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations d'administrateur</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md">
            {user?.avatar || '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name}</p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 mt-1">
              ⚙️ Administrateur
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations personnelles</h3>
          {[['name','Nom complet','text'],['phone','Téléphone','tel'],['email','Email','email']].map(([k,l,t]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">{l}</label>
              <input type={t} value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${saved ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'} disabled:opacity-50`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? '✅ Enregistré !' : <><Save className="w-4 h-4" />Enregistrer</>}
          </button>
        </form>

        <button onClick={logout} className="w-full py-3 border-2 border-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">
          Se déconnecter
        </button>
      </div>
    </AdminLayout>
  );
}
