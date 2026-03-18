import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Car, ChevronRight, LogOut } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';
import { QRScanner } from '../../components/QRScanner.jsx';

const STATUS_CFG = {
  parking:   { label: 'Stationnement', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  parked:    { label: 'Stationné',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  requested: { label: '🔔 Récupération', color: 'bg-red-100 text-red-700 border-red-200' },
  accepted:  { label: 'Acceptée',      color: 'bg-violet-100 text-violet-700 border-violet-200' },
  returning: { label: 'En retour',     color: 'bg-blue-100 text-blue-700 border-blue-200' },
  arrived:   { label: 'Arrivé',        color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export function UserScan() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [missions, setMissions]       = useState([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError]     = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [connected, setConnected]     = useState(false);
  const { toasts, addToast, removeToast, requestPermission } = useNotifications();

  const token = localStorage.getItem('vt_token');

  useEffect(() => {
    requestPermission();
    loadMissions();
  }, []);

  async function loadMissions() {
    try {
      const { missions: ms } = await api.getMissions();
      setMissions(ms);
      setPendingCount(ms.filter(m => m.status === 'requested').length);
    } catch {}
  }

  useSSE(token ? api.sseValet() : null, {
    connected: () => setConnected(true),
    mission_created: ({ mission }) => {
      setMissions(p => [mission, ...p.filter(m => m.id !== mission.id)]);
    },
    mission_updated: ({ mission }) => {
      setMissions(p => p.map(m => m.id === mission.id ? mission : m));
    },
    mission_done: ({ mission }) => {
      setMissions(p => p.filter(m => m.id !== mission.id));
    },
    recovery_request: (data) => {
      addToast({ ...data, type: 'recovery_request' });
      setPendingCount(c => c + 1);
      loadMissions();
    },
    mission_taken: ({ missionId, takenBy }) => {
      // La mission a été prise par quelqu'un d'autre → la retirer des requested
      setMissions(p => p.map(m => m.id === missionId ? { ...m, status: 'accepted' } : m));
      setPendingCount(c => Math.max(0, c - 1));
    },
    notification: (data) => addToast(data),
  });

  const handleScan = async (qrData) => {
    setShowScanner(false);
    setScanError('');
    // Le QR code encode l'URL : https://host/client/qrId  ou juste l'ID : QR-001
    const qrId = qrData.includes('/') ? qrData.split('/').pop() : qrData;

    try {
      // Vérifier si une mission existe déjà pour ce QR
      try {
        const { mission } = await api.getMissionByQR(qrId);
        if (mission) {
          // Mission existante → aller dessus
          navigate(`/user/mission/${mission.id}`);
          return;
        }
      } catch {}

      // Pas de mission → créer une nouvelle
      navigate(`/user/mission/new?qr=${qrId}`);
    } catch (err) {
      setScanError(err.message);
      addToast({ type: 'default', title: '❌ Erreur', body: err.message });
    }
  };

  const activeMissions = missions.filter(m => !['done'].includes(m.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <Toasts toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">{user?.avatar || 'V'}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{user?.name}</p>
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                <p className="text-xs text-gray-500">{connected ? 'Connecté' : 'Connexion…'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigate('/user/notifications'); setPendingCount(0); }}
              className="relative w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Bell className="w-5 h-5 text-gray-600" />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                  {pendingCount}
                </span>
              )}
            </button>
            <button onClick={logout} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200">
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-sm mx-auto space-y-4">
        {/* Alerte missions en attente */}
        {pendingCount > 0 && (
          <button onClick={() => { navigate('/user/notifications'); setPendingCount(0); }}
            className="w-full bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-bold text-red-700">{pendingCount} demande{pendingCount > 1 ? 's' : ''} urgente{pendingCount > 1 ? 's' : ''} !</p>
              <p className="text-xs text-red-500">Un client attend son véhicule</p>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400" />
          </button>
        )}

        {/* Bouton scanner */}
        {!showScanner ? (
          <button onClick={() => { setShowScanner(true); setScanError(''); }}
            className="w-full bg-gradient-to-br from-emerald-600 to-green-700 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
              <span className="text-5xl">📷</span>
            </div>
            <div className="text-center">
              <span className="text-white text-xl font-bold block">Scanner le QR Code</span>
              <span className="text-white/70 text-sm">Caméra du client</span>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <QRScanner onScan={handleScan} onError={err => { setScanError(err); setShowScanner(false); }} active={showScanner} />
            <button onClick={() => setShowScanner(false)}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">
              Annuler
            </button>
          </div>
        )}

        {scanError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{scanError}</div>
        )}

        {/* Missions communes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Toutes les missions</h2>
            <button onClick={loadMissions} className="text-xs text-emerald-600 font-semibold">↻ Actualiser</button>
          </div>

          {activeMissions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Car className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Aucune mission active</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeMissions.map(m => {
                const cfg = STATUS_CFG[m.status] || STATUS_CFG.parking;
                return (
                  <button key={m.id} onClick={() => navigate(`/user/mission/${m.id}`)}
                    className="w-full bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-gray-900 text-sm">{m.ticket}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{m.vehicle.marque} · {m.vehicle.couleur} · {m.vehicle.immatriculation}</p>
                        {m.acceptedBy && (
                          <p className="text-xs text-violet-600 mt-0.5">Prise par {m.acceptedName}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
