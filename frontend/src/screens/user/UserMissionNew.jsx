import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Car, Hash, MapPin, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useGPS } from '../../hooks/useGPS.js';

const COLORS = [
  { name: 'Noir',   hex: '#111827' },
  { name: 'Blanc',  hex: '#f9fafb', border: true },
  { name: 'Argent', hex: '#9ca3af' },
  { name: 'Gris',   hex: '#6b7280' },
  { name: 'Rouge',  hex: '#dc2626' },
  { name: 'Bleu',   hex: '#2563eb' },
  { name: 'Vert',   hex: '#16a34a' },
  { name: 'Beige',  hex: '#d4b896' },
];

export function UserMissionNew() {
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const qrId       = params.get('qr') || '';

  const [marque,  setMarque]  = useState('');
  const [couleur, setCouleur] = useState('');
  const [immat,   setImmat]   = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [parkingLoc, setParkingLoc] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { captureOnce } = useGPS({ enabled: false });

  const handleLocate = async () => {
    setLocating(true);
    setLocError('');
    try {
      const loc = await captureOnce();
      setParkingLoc(loc);
    } catch (e) {
      setLocError('Impossible d\'obtenir la position. Autorisez la géolocalisation.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!marque || !couleur || !immat) return;
    setSubmitting(true);
    setError('');
    try {
      const { mission } = await api.createMission({
        qrId,
        vehicle: { marque, couleur, immatriculation: immat },
        parkingLocation: parkingLoc,
      });
      navigate(`/user/mission/${mission.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <button onClick={() => navigate('/user/scan')}
            className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Nouvelle mission</h1>
            <p className="text-xs text-gray-400 font-mono">{qrId}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 max-w-sm mx-auto pb-8">
        {/* Ticket QR */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shrink-0 text-lg">📷</div>
          <div>
            <p className="text-xs text-emerald-600 font-semibold">Carte QR scannée</p>
            <p className="text-lg font-bold text-emerald-800 font-mono">{qrId || 'QR-???'}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Marque */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Car className="w-4 h-4 text-gray-400" />Marque et modèle *
          </label>
          <input type="text" value={marque} onChange={e => setMarque(e.target.value)}
            placeholder="ex: Mercedes Classe C" required
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm focus:outline-none focus:border-emerald-500 transition-all" />
        </div>

        {/* Couleur */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <label className="text-sm font-bold text-gray-700">Couleur *</label>
          <div className="grid grid-cols-8 gap-2">
            {COLORS.map(c => (
              <button key={c.name} type="button" onClick={() => setCouleur(c.name)} title={c.name}
                className={`relative w-9 h-9 rounded-xl transition-all ${couleur === c.name ? 'scale-110 ring-2 ring-emerald-500 ring-offset-1' : ''} ${c.border ? 'border border-gray-200' : ''}`}
                style={{ backgroundColor: c.hex }}>
                {couleur === c.name && (
                  <span className="absolute inset-0 flex items-center justify-center text-sm"
                    style={{ color: c.hex === '#f9fafb' ? '#000' : '#fff' }}>✓</span>
                )}
              </button>
            ))}
          </div>
          {couleur && <p className="text-xs text-gray-500">Sélectionné : <strong>{couleur}</strong></p>}
        </div>

        {/* Immatriculation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <Hash className="w-4 h-4 text-gray-400" />Immatriculation *
          </label>
          <input type="text" value={immat} onChange={e => setImmat(e.target.value.toUpperCase())}
            placeholder="ex: 12345-A-6" required
            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-emerald-500 transition-all" />
        </div>

        {/* Géolocalisation parking */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
            <MapPin className="w-4 h-4 text-gray-400" />Emplacement du parking
          </label>
          {parkingLoc ? (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-700">Position enregistrée ✓</p>
                <p className="text-xs text-emerald-600 font-mono">
                  {parkingLoc.lat.toFixed(5)}, {parkingLoc.lng.toFixed(5)}
                </p>
                {parkingLoc.accuracy && (
                  <p className="text-xs text-emerald-500">Précision : ±{Math.round(parkingLoc.accuracy)}m</p>
                )}
              </div>
              <button type="button" onClick={() => setParkingLoc(null)} className="ml-auto text-xs text-emerald-600 underline">
                Changer
              </button>
            </div>
          ) : (
            <button type="button" onClick={handleLocate} disabled={locating}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all disabled:opacity-50">
              {locating
                ? <><Loader2 className="w-4 h-4 animate-spin" />Localisation…</>
                : <><MapPin className="w-4 h-4" />Enregistrer ma position GPS</>}
            </button>
          )}
          {locError && <p className="text-xs text-red-600">{locError}</p>}
          <p className="text-xs text-gray-400">La position GPS permet au client de voir où son véhicule est stationné.</p>
        </div>

        <button type="submit" disabled={!marque || !couleur || !immat || submitting}
          className="w-full py-4 rounded-2xl font-bold text-base bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-100 active:scale-[0.98]">
          {submitting ? 'Création de la mission…' : 'Créer la mission'}
        </button>
      </form>
    </div>
  );
}
