import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Navigation, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useSSE } from '../../hooks/useSSE.js';
import { useGPS } from '../../hooks/useGPS.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';
import { LiveMap, haversineMeters } from '../../components/LiveMap.jsx';

export function UserReturn() {
  const navigate   = useNavigate();
  const { id }     = useParams();
  const [mission, setMission]       = useState(null);
  const [myPos, setMyPos]           = useState(null);
  const [loading, setLoading]       = useState(false);
  const { toasts, addToast, removeToast } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => { loadMission(); }, [id]);

  async function loadMission() {
    try {
      const { missions } = await api.getMissions();
      const m = missions.find(x => x.id === id);
      if (m) setMission(m);
    } catch {}
  }

  // GPS actif pendant le retour — envoie la position au serveur toutes les 5s
  const { position, error: gpsError } = useGPS({
    enabled: true,
    interval: 5000,
    onUpdate: async (loc) => {
      try { await api.updateLocation(id, loc.lat, loc.lng, loc.accuracy); }
      catch {}
      setMyPos(loc);
    },
  });

  useSSE(token ? api.sseValet() : null, {
    mission_updated: ({ mission: m }) => { if (m.id === id) setMission(m); },
    notification: data => addToast(data),
  });

  const handleArrived = async () => {
    setLoading(true);
    try {
      await api.updateStatus(id, 'arrived');
      addToast({ type: 'arrived', title: '✅ Arrivée confirmée', body: 'Le client a été notifié. Demandez-lui sa carte QR.', urgent: true });
      navigate(`/user/close/${id}`);
    } catch (err) {
      addToast({ type: 'default', title: '❌ Erreur', body: err.message });
      setLoading(false);
    }
  };

  // Distance entre voiturier et client (destination)
  const clientPos = mission?.parkingLocation ? null : null; // Le client est à l'entrée, pas au parking
  const curPos    = position || myPos;

  const distanceM = curPos && mission?.parkingLocation
    ? Math.round(haversineMeters(curPos.lat, curPos.lng, mission.parkingLocation.lat, mission.parkingLocation.lng))
    : null;

  if (!mission) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toasts toasts={toasts} onRemove={removeToast} />

      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/user/mission/${id}`)} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">Retour du véhicule</h1>
              <p className="text-xs text-gray-500">{mission.ticket} · {mission.vehicle.marque}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${curPos ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            <Navigation className={`w-3.5 h-3.5 ${curPos ? 'animate-pulse' : ''}`} />
            {curPos ? 'GPS actif' : 'GPS…'}
          </div>
        </div>
      </div>

      {/* Carte Leaflet */}
      <div className="relative" style={{ height: '280px' }}>
        <LiveMap
          valetPos={curPos}
          clientPos={null}
          className="w-full h-full"
        />
        {!curPos && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Activation du GPS…</p>
            </div>
          </div>
        )}
        {curPos && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-xl px-3 py-2 shadow text-xs font-bold text-blue-700 flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
            Position partagée avec le client
          </div>
        )}
      </div>

      {/* Infos + bouton */}
      <div className="bg-white p-4 space-y-4 border-t border-gray-100">
        {gpsError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
            ⚠️ GPS : {gpsError}. Le client peut quand même voir votre progression.
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="text-2xl">🚗</div>
          <div>
            <p className="font-bold text-gray-900">{mission.vehicle.marque}</p>
            <p className="text-xs text-gray-500">{mission.vehicle.immatriculation} · {mission.vehicle.couleur}</p>
          </div>
          {distanceM !== null && (
            <div className="ml-auto text-right">
              <p className="text-lg font-bold text-blue-700">{distanceM < 1000 ? `${distanceM}m` : `${(distanceM/1000).toFixed(1)}km`}</p>
              <p className="text-xs text-gray-400">depuis parking</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-sm font-semibold text-blue-700">📍 Le client suit votre position en temps réel</p>
          <p className="text-xs text-blue-600 mt-0.5">Mise à jour automatique toutes les 5 secondes</p>
        </div>

        <button onClick={handleArrived} disabled={loading}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
          ✅ Je suis arrivé avec le véhicule
        </button>
      </div>
    </div>
  );
}
