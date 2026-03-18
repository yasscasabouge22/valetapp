import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Car, MapPin, CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { useGPS } from '../../hooks/useGPS.js';
import { Toasts } from '../../components/Toasts.jsx';

const STATUS_LABEL = {
  parking:   'Stationnement en cours',
  parked:    'Stationné',
  requested: '🔔 Récupération demandée',
  accepted:  'Mission acceptée',
  returning: '🚗 En retour',
  arrived:   '✅ Arrivé',
  done:      'Terminé',
};
const STATUS_COLOR = {
  parking:   'bg-amber-100 text-amber-700',
  parked:    'bg-emerald-100 text-emerald-700',
  requested: 'bg-red-100 text-red-700',
  accepted:  'bg-violet-100 text-violet-700',
  returning: 'bg-blue-100 text-blue-700',
  arrived:   'bg-emerald-100 text-emerald-700',
  done:      'bg-gray-100 text-gray-600',
};

export function UserMission() {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const { user }  = useAuth();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savingParking, setSavingParking] = useState(false);
  const { toasts, addToast, removeToast } = useNotifications();
  const token = localStorage.getItem('vt_token');
  const { captureOnce } = useGPS({ enabled: false });

  useEffect(() => { loadMission(); }, [id]);

  async function loadMission() {
    try {
      const { missions } = await api.getMissions();
      const m = missions.find(x => x.id === id);
      if (m) setMission(m);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    mission_updated: ({ mission: m }) => { if (m.id === id) setMission(m); },
    notification: data => addToast(data),
  });

  // Enregistrer la position de stationnement
  const handleSaveParking = async () => {
    setSavingParking(true);
    try {
      const loc = await captureOnce();
      await api.saveParkingLocation(id, loc.lat, loc.lng, loc.accuracy);
      setMission(m => ({ ...m, parkingLocation: loc }));
      addToast({ type: 'parked', title: '📍 Position enregistrée', body: `±${Math.round(loc.accuracy || 0)}m de précision` });
    } catch (e) {
      addToast({ type: 'default', title: '❌ GPS indisponible', body: e.message });
    } finally {
      setSavingParking(false);
    }
  };

  const handleStatus = async (status) => {
    setLoading(true);
    try {
      const { mission: m } = await api.updateStatus(id, status);
      setMission(m);
      if (status === 'parked') {
        addToast({ type: 'parked', title: '🅿️ Véhicule stationné', body: 'Le client a été notifié' });
      }
      if (status === 'returning') {
        navigate(`/user/return/${id}`);
      }
    } catch (err) {
      addToast({ type: 'default', title: '❌ Erreur', body: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!mission) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  const isMyMission = mission.valetId === user?.id || mission.acceptedBy === user?.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/user/scan')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Mission {mission.ticket}</h1>
              <p className="text-xs text-gray-400">{new Date(mission.createdAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${STATUS_COLOR[mission.status]}`}>
            {STATUS_LABEL[mission.status]}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-sm mx-auto pb-8">
        {/* Véhicule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg">{mission.vehicle.marque}</p>
                <p className="text-white/60 text-sm">{mission.vehicle.couleur} · {mission.vehicle.immatriculation}</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Ticket</span>
              <span className="font-mono font-bold text-gray-900">{mission.ticket}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className="text-gray-500">Voiturier</span>
              <span className="font-semibold text-gray-900">{mission.valetName}</span>
            </div>
            {mission.acceptedBy && (
              <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Mission retour</span>
                <span className="font-semibold text-violet-700">{mission.acceptedName}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-gray-500">Parking</span>
              {mission.parkingLocation
                ? <span className="text-emerald-600 font-semibold text-xs">📍 GPS enregistré</span>
                : <span className="text-gray-400 text-xs">Non enregistré</span>
              }
            </div>
          </div>
        </div>

        {/* Actions selon statut */}
        {mission.status === 'parking' && (
          <div className="space-y-3">
            {/* Enregistrer le parking GPS si pas encore fait */}
            {!mission.parkingLocation && (
              <button onClick={handleSaveParking} disabled={savingParking}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-50 border-2 border-blue-200 text-blue-700 rounded-2xl font-semibold hover:bg-blue-100 transition-all disabled:opacity-50">
                {savingParking ? <><Loader2 className="w-4 h-4 animate-spin" />Localisation…</>
                  : <><MapPin className="w-4 h-4" />Enregistrer position parking</>}
              </button>
            )}
            <button onClick={() => handleStatus('parked')} disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              Véhicule stationné ✓
            </button>
          </div>
        )}

        {mission.status === 'parked' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
            <p className="text-base font-bold text-emerald-700">✅ Véhicule stationné</p>
            <p className="text-sm text-emerald-600 mt-1">En attente de la demande du client</p>
          </div>
        )}

        {mission.status === 'requested' && !mission.acceptedBy && (
          <button onClick={() => handleStatus('accepted')} disabled={loading}
            className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-md hover:bg-violet-700 active:scale-[0.98] transition-all animate-pulse disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            🔔 Accepter la mission de récupération
          </button>
        )}

        {mission.status === 'accepted' && mission.acceptedBy === user?.id && (
          <button onClick={() => handleStatus('returning')} disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-md hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            🚗 Je pars chercher le véhicule
          </button>
        )}

        {(mission.status === 'returning' || mission.status === 'arrived') && isMyMission && (
          <button onClick={() => navigate(`/user/return/${id}`)}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
            🗺️ Voir la carte de retour <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {mission.status === 'arrived' && isMyMission && (
          <button onClick={() => navigate(`/user/close/${id}`)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all">
            📷 Scanner QR pour clôturer la mission
          </button>
        )}
      </div>
    </div>
  );
}
