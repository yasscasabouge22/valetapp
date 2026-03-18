import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Car, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../api.js';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';

export function UserNotifications() {
  const navigate = useNavigate();
  const [missions, setMissions]   = useState([]);
  const [accepting, setAccepting] = useState(null);
  const [loading, setLoading]     = useState(true);
  const { toasts, addToast, removeToast } = useNotifications();
  const token = localStorage.getItem('vt_token');

  useEffect(() => { loadRequests(); }, []);

  async function loadRequests() {
    setLoading(true);
    try {
      const { missions: ms } = await api.getMissions();
      setMissions(ms.filter(m => m.status === 'requested'));
    } catch {}
    finally { setLoading(false); }
  }

  useSSE(token ? api.sseValet() : null, {
    recovery_request: (data) => {
      addToast({ ...data, type: 'recovery_request' });
      loadRequests();
    },
    mission_taken: ({ missionId }) => {
      setMissions(p => p.filter(m => m.id !== missionId));
    },
    mission_updated: ({ mission }) => {
      if (mission.status !== 'requested') {
        setMissions(p => p.filter(m => m.id !== mission.id));
      }
    },
  });

  const handleAccept = async (mission) => {
    setAccepting(mission.id);
    try {
      await api.updateStatus(mission.id, 'accepted');
      // Les autres voituriers recevront mission_taken via SSE
      addToast({ type: 'accepted', title: '✅ Mission acceptée', body: `Allez chercher ${mission.vehicle.marque}` });
      setTimeout(() => navigate(`/user/mission/${mission.id}`), 700);
    } catch (err) {
      addToast({ type: 'default', title: '❌ Erreur', body: err.message });
      setAccepting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toasts toasts={toasts} onRemove={removeToast} />

      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <button onClick={() => navigate('/user/scan')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">Demandes de récupération</h1>
            <p className="text-xs text-gray-500">{missions.length} en attente · Communes à tous les voituriers</p>
          </div>
          {missions.length > 0 && (
            <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
              {missions.length}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 max-w-sm mx-auto space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : missions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">Aucune demande en attente</p>
            <p className="text-xs text-gray-400 mt-1">Les nouvelles demandes apparaissent instantanément</p>
          </div>
        ) : (
          missions.map(mission => {
            const isAccepting = accepting === mission.id;
            const elapsed = Math.round((Date.now() - new Date(mission.updatedAt).getTime()) / 60000);
            return (
              <div key={mission.id}
                className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${isAccepting ? 'border-emerald-200' : 'border-red-200'}`}>
                {/* Banner urgence */}
                <div className={`px-4 py-2 flex items-center gap-2 text-xs font-bold ${isAccepting ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {isAccepting
                    ? <><CheckCircle className="w-3.5 h-3.5" />Mission acceptée</>
                    : <><AlertTriangle className="w-3.5 h-3.5 animate-bounce" />⚡ Urgent · il y a {elapsed < 1 ? '<1' : elapsed} min</>}
                </div>

                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                      <Car className="w-6 h-6 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{mission.vehicle.marque}</p>
                      <p className="text-xs text-gray-500">{mission.vehicle.immatriculation} · {mission.vehicle.couleur}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-gray-900 text-sm">{mission.ticket}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(mission.createdAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {!isAccepting ? (
                    <button onClick={() => handleAccept(mission)}
                      className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      J'accepte cette mission
                    </button>
                  ) : (
                    <div className="w-full bg-emerald-50 border border-emerald-200 py-3 rounded-xl text-center text-sm font-bold text-emerald-700 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      En route pour le véhicule…
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
