import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ManagerLayout } from '../shared/Layout.jsx';
import { Save, Loader2 } from 'lucide-react';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

export function ManagerProfil() {
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    <ManagerLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-lg">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
          <p className="text-sm text-gray-500">Gérez vos informations personnelles</p>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-md">
            {user?.avatar || '?'}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{user?.name}</p>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700 mt-1">
              👔 Manager
            </span>
          </div>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Informations personnelles</h3>
          {[
            ['name',  'Nom complet', 'text'],
            ['phone', 'Téléphone',   'tel'],
            ['email', 'Email',       'email'],
          ].map(([k,l,t]) => (
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

        {/* Déconnexion */}
        <button onClick={logout}
          className="w-full py-3 border-2 border-red-100 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 transition-all">
          Se déconnecter
        </button>
      </div>
    </ManagerLayout>
  );
}
