import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Home, Car, Clock, CheckCircle2, Navigation, Loader2, MapPin } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api.js';
import { useSSE } from '../../hooks/useSSE.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { Toasts } from '../../components/Toasts.jsx';
import { QRScanner } from '../../components/QRScanner.jsx';

// Distance Haversine en mètres
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── Carte simple SVG (sans dépendance externe) ─────────────
function SimpleMap({ valetPos, parkingPos, label = 'Votre véhicule' }) {
  const canvasRef = useRef(null);

  // Positions de démo si pas de GPS réel
  const valet   = valetPos   || { lat: 33.5745, lng: -7.5870 };
  const parking = parkingPos || { lat: 33.5731, lng: -7.5898 };

  const dist = valetPos && parkingPos
    ? Math.round(haversineMeters(valet.lat, valet.lng, parking.lat, parking.lng))
    : null;

  // Convertir coords GPS en coords SVG (200x140)
  const toSVG = (lat, lng) => {
    const minLat = Math.min(valet.lat, parking.lat) - 0.002;
    const maxLat = Math.max(valet.lat, parking.lat) + 0.002;
    const minLng = Math.min(valet.lng, parking.lng) - 0.003;
    const maxLng = Math.max(valet.lng, parking.lng) + 0.003;
    const x = ((lng - minLng) / (maxLng - minLng)) * 180 + 10;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 120 + 10;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const vSVG = toSVG(valet.lat, valet.lng);
  const pSVG = toSVG(parking.lat, parking.lng);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 bg-slate-100">
      <svg viewBox="0 0 200 140" className="w-full" style={{ height: 200 }}>
        {/* Fond carte */}
        <rect width="200" height="140" fill="#f1f5f9"/>
        {/* Grille */}
        {[0,40,80,120,160,200].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="140" stroke="#e2e8f0" strokeWidth="0.5"/>
        ))}
        {[0,35,70,105,140].map(y => (
          <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#e2e8f0" strokeWidth="0.5"/>
        ))}
        {/* Routes simulées */}
        <rect x="0" y="60" width="200" height="12" fill="#e2e8f0" opacity="0.8"/>
        <rect x="90" y="0" width="10" height="140" fill="#e2e8f0" opacity="0.8"/>

        {/* Ligne entre voiturier et parking */}
        <line x1={vSVG.x} y1={vSVG.y} x2={pSVG.x} y2={pSVG.y}
          stroke="#3b82f6" strokeWidth="2" strokeDasharray="4 3" opacity="0.7"/>

        {/* Marqueur parking */}
        <circle cx={pSVG.x} cy={pSVG.y} r="10" fill="#10b981"/>
        <text x={pSVG.x} y={pSVG.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="white">P</text>
        <text x={pSVG.x} y={pSVG.y+18} textAnchor="middle" fontSize="7" fill="#065f46" fontWeight="bold">Parking</text>

        {/* Marqueur voiturier */}
        <circle cx={vSVG.x} cy={vSVG.y} r="11" fill="#3b82f6"/>
        <circle cx={vSVG.x} cy={vSVG.y} r="11" fill="none" stroke="#93c5fd" strokeWidth="3" opacity="0.5">
          <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x={vSVG.x} y={vSVG.y+1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="white">🚗</text>
        <text x={vSVG.x} y={vSVG.y-18} textAnchor="middle" fontSize="7" fill="#1e40af" fontWeight="bold">{label}</text>
      </svg>

      <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-blue-600 font-semibold">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"/>
          GPS en direct
        </div>
        {dist !== null && (
          <div className="text-xs font-bold text-gray-700">
            {dist < 1000 ? `${dist}m` : `${(dist/1000).toFixed(1)}km`} restant
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ClientHome ─────────────────────────────────────────────
export function ClientHome() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  const handleScan = (qrData) => {
    const qrId = qrData.includes('/') ? qrData.split('/').pop() : qrData;
    setScanning(false);
    navigate(`/client/ticket/${qrId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-100 text-2xl">
            🚗
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Service Voiturier</h1>
          <p className="text-gray-500 text-sm mt-1">Scannez votre carte QR pour accéder à votre ticket</p>
        </div>

        {!scanning ? (
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 space-y-4">
            <button onClick={() => { setScanning(true); setError(''); }}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-md shadow-emerald-100">
              <span className="text-xl">📷</span>Scanner ma carte QR
            </button>
            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            <p className="text-xs text-gray-400 text-center">
              Pointez la caméra vers le QR code de votre carte
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <QRScanner
              onScan={handleScan}
              onError={(e) => { setError(e); setScanning(false); }}
              active={scanning}
            />
            <button onClick={() => setScanning(false)}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ClientTicket ────────────────────────────────────────────
export function ClientTicket() {
  const navigate = useNavigate();
  const { qrId } = useParams();
  const [mission, setMission] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [clientPos, setClientPos] = useState(null);
  const { toasts, addToast, removeToast, requestPermission } = useNotifications();

  useEffect(() => {
    requestPermission();
    loadMission();
    // Obtenir position client pour calculer distance parking
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setClientPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, [qrId]);

  async function loadMission() {
    try {
      const { mission: m } = await api.getMissionByQR(qrId);
      setMission(m);
    } catch {
      setError('Aucune mission trouvée pour ce ticket. Le voiturier doit d\'abord créer la mission.');
    }
  }

  useSSE(api.sseClient(qrId), {
    notification: (data) => {
      addToast(data);
      if (data.type === 'returning') setTimeout(() => navigate(`/client/map/${qrId}`), 1500);
      if (data.type === 'arrived')   navigate(`/client/arrival/${qrId}`);
      if (data.type === 'done')      navigate(`/client/done/${qrId}`);
    },
    mission_updated: ({ mission: m }) => {
      setMission(m);
      if (m.status === 'returning') navigate(`/client/map/${qrId}`);
      if (m.status === 'arrived')   navigate(`/client/arrival/${qrId}`);
      if (m.status === 'done')      navigate(`/client/done/${qrId}`);
    },
  });

  const handleRequest = async () => {
    if (!mission) return;
    setRequesting(true);
    try {
      await api.updateStatus(mission.id, 'requested');
      setMission(m => ({ ...m, status: 'requested' }));
      navigate(`/client/waiting/${qrId}`);
    } catch (err) {
      setError(err.message);
      setRequesting(false);
    }
  };

  const STATUS = {
    parking:   { badge: '⏳ Stationnement en cours', color: 'bg-amber-100 text-amber-700' },
    parked:    { badge: '✅ Véhicule stationné',     color: 'bg-emerald-100 text-emerald-700' },
    requested: { badge: '🔔 Demande envoyée',        color: 'bg-violet-100 text-violet-700' },
    accepted:  { badge: '🚗 Voiturier en route',     color: 'bg-blue-100 text-blue-700' },
    returning: { badge: '🚗 Votre véhicule arrive',  color: 'bg-blue-100 text-blue-700' },
    arrived:   { badge: '🎉 Votre véhicule est là',  color: 'bg-emerald-100 text-emerald-700' },
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-gray-700 font-semibold mb-2">Ticket non trouvé</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Link to="/client/accueil" className="text-sm text-emerald-600 font-semibold hover:underline">← Retour</Link>
      </div>
    </div>
  );

  if (!mission) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  const st = STATUS[mission.status] || STATUS.parking;
  const distM = clientPos && mission.parkingLocation
    ? Math.round(haversineMeters(clientPos.lat, clientPos.lng, mission.parkingLocation.lat, mission.parkingLocation.lng))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-3 max-w-sm mx-auto">
          <Link to="/client/accueil" className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <Home className="w-4 h-4 text-gray-700" />
          </Link>
          <h1 className="text-base font-bold text-gray-900">Votre Ticket</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-sm mx-auto pb-8">
        {/* Ticket QR */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Ticket Voiturier</p>
                <p className="text-2xl font-bold mt-1 font-mono">{mission.ticket}</p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🚗</div>
            </div>
          </div>
          <div className="p-6 flex flex-col items-center gap-3 border-b border-dashed border-gray-200">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
              <QRCodeSVG
                value={`${window.location.origin}/client/ticket/${qrId}`}
                size={160} level="M" fgColor="#111827"
              />
            </div>
            <p className="text-xs text-gray-400 text-center">Remettez cette carte au voiturier lors de la restitution</p>
          </div>
          <div className="px-5 py-3">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${st.color}`}>{st.badge}</span>
          </div>
        </div>

        {/* Infos véhicule */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Votre véhicule</h3>
          {[
            ['Marque', mission.vehicle.marque],
            ['Couleur', mission.vehicle.couleur || '—'],
            ['Immatriculation', mission.vehicle.immatriculation || '—'],
          ].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-500">{l}</span>
              <span className="text-sm font-bold text-gray-900">{v}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">
              Déposé à {new Date(mission.createdAt).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Emplacement parking */}
        {mission.parkingLocation && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Emplacement de stationnement</h3>
              {distM !== null && (
                <span className="ml-auto text-xs text-emerald-600 font-semibold">📍 {distM < 1000 ? `${distM}m` : `${(distM/1000).toFixed(1)}km`} de vous</span>
              )}
            </div>
            <SimpleMap
              valetPos={mission.parkingLocation}
              parkingPos={mission.parkingLocation}
              label="Parking"
            />
          </div>
        )}

        {/* CTA boutons selon statut */}
        {mission.status === 'parked' && (
          <button onClick={handleRequest} disabled={requesting}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold shadow-sm hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            🚗 Récupérer mon véhicule
          </button>
        )}
        {mission.status === 'requested' && (
          <div className="w-full bg-violet-50 border border-violet-200 text-violet-700 py-4 rounded-2xl font-bold text-center text-sm">
            🔔 Demande envoyée — Un voiturier va accepter
          </div>
        )}
        {(mission.status === 'accepted' || mission.status === 'returning') && (
          <button onClick={() => navigate(`/client/map/${qrId}`)}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all animate-pulse">
            🗺️ Suivre mon véhicule en temps réel
          </button>
        )}
        {mission.status === 'arrived' && (
          <button onClick={() => navigate(`/client/arrival/${qrId}`)}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all animate-bounce">
            🎉 Votre véhicule est arrivé !
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ClientWaiting ───────────────────────────────────────────
export function ClientWaiting() {
  const navigate = useNavigate();
  const { qrId } = useParams();
  const [dots, setDots] = useState(1);
  const { toasts, addToast, removeToast } = useNotifications();

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d % 3) + 1), 600);
    return () => clearInterval(t);
  }, []);

  useSSE(api.sseClient(qrId), {
    mission_updated: ({ mission }) => {
      if (['accepted','returning'].includes(mission.status)) navigate(`/client/map/${qrId}`);
      if (mission.status === 'arrived') navigate(`/client/arrival/${qrId}`);
    },
    notification: (data) => {
      addToast(data);
      if (['accepted','returning'].includes(data.type)) setTimeout(() => navigate(`/client/map/${qrId}`), 1200);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50 flex flex-col items-center justify-center p-6">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 w-32 h-32 rounded-full border-4 border-blue-100 animate-ping opacity-30" />
            <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-200 relative z-10 text-5xl">
              🚗
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recherche d'un voiturier{'.'.repeat(dots)}</h1>
          <p className="text-gray-500 text-sm mt-2">Tous les voituriers disponibles ont été notifiés</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          {[
            { n:'1', l:'Demande envoyée', done:true },
            { n:'2', l:'Notification envoyée aux voituriers', done:true },
            { n:'3', l:"En attente d'acceptation…", active:true },
            { n:'4', l:'Voiturier en route', done:false },
          ].map(({ n, l, done, active }) => (
            <div key={n} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                {done ? '✓' : n}
              </div>
              <span className={`text-sm ${done||active ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>{l}</span>
            </div>
          ))}
        </div>
        <Link to={`/client/ticket/${qrId}`} className="text-sm text-gray-400 hover:text-gray-600">← Retour au ticket</Link>
      </div>
    </div>
  );
}

// ─── ClientMap ───────────────────────────────────────────────
export function ClientMap() {
  const navigate = useNavigate();
  const { qrId } = useParams();
  const [mission, setMission] = useState(null);
  const [valetPos, setValetPos] = useState(null);
  const [clientPos, setClientPos] = useState(null);
  const { toasts, addToast, removeToast } = useNotifications();

  useEffect(() => {
    // Charger la mission
    api.getMissionByQR(qrId).then(({ mission: m }) => {
      setMission(m);
      if (m?.valetLocation) setValetPos(m.valetLocation);
    }).catch(() => {});

    // Position du client
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => setClientPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {}
      );
    }
  }, [qrId]);

  useSSE(api.sseClient(qrId), {
    gps_update: ({ lat, lng }) => setValetPos({ lat, lng }),
    mission_updated: ({ mission: m }) => {
      setMission(m);
      if (m?.valetLocation) setValetPos(m.valetLocation);
      if (m.status === 'arrived') navigate(`/client/arrival/${qrId}`);
      if (m.status === 'done')    navigate(`/client/done/${qrId}`);
    },
    notification: (data) => {
      addToast(data);
      if (data.type === 'arrived') navigate(`/client/arrival/${qrId}`);
    },
  });

  const distanceM = valetPos && clientPos
    ? Math.round(haversineMeters(valetPos.lat, valetPos.lng, clientPos.lat, clientPos.lng))
    : null;
  const etaMin = distanceM ? Math.max(1, Math.ceil(distanceM / 100)) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toasts toasts={toasts} onRemove={removeToast} />

      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Votre véhicule arrive</h1>
          <p className="text-xs text-gray-500">Suivi GPS en temps réel</p>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
          <Navigation className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span className="text-xs font-bold text-blue-700">Live</span>
        </div>
      </div>

      {/* Carte SVG (fonctionne sans internet) */}
      <div className="flex-1 p-4">
        <SimpleMap valetPos={valetPos} parkingPos={clientPos} label="Voiturier" />
      </div>

      {/* Infos bas */}
      <div className="bg-white p-4 space-y-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Navigation className="w-4 h-4 text-blue-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-blue-700">
              {distanceM !== null ? (distanceM < 1000 ? `${distanceM}m` : `${(distanceM/1000).toFixed(1)}km`) : '…'}
            </p>
            <p className="text-[10px] text-gray-500">Distance</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <Clock className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-700">
              {etaMin !== null ? `~${etaMin}min` : '…'}
            </p>
            <p className="text-[10px] text-gray-500">Arrivée</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <Car className="w-4 h-4 text-gray-500 mx-auto mb-1" />
            <p className="text-xs font-bold text-gray-700 leading-tight truncate">
              {mission?.vehicle?.marque?.split(' ')[0] || '…'}
            </p>
            <p className="text-[10px] text-gray-400">{mission?.vehicle?.immatriculation || '…'}</p>
          </div>
        </div>

        {!valetPos && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <p className="text-sm text-amber-700 font-semibold">
              ⏳ En attente de la position GPS du voiturier…
            </p>
            <p className="text-xs text-amber-600 mt-1">La carte se mettra à jour automatiquement</p>
          </div>
        )}

        {distanceM !== null && distanceM < 50 && (
          <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-center animate-pulse">
            <p className="text-sm font-bold text-emerald-700">🎉 Votre véhicule est presque là !</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ClientArrival ───────────────────────────────────────────
export function ClientArrival() {
  const navigate = useNavigate();
  const { qrId } = useParams();
  const [mission, setMission] = useState(null);
  const { toasts, addToast, removeToast } = useNotifications();

  useEffect(() => {
    api.getMissionByQR(qrId).then(({ mission: m }) => setMission(m)).catch(() => {});
  }, [qrId]);

  useSSE(api.sseClient(qrId), {
    notification: (data) => { addToast(data); if (data.type === 'done') navigate(`/client/done/${qrId}`); },
    mission_updated: ({ mission: m }) => { setMission(m); if (m.status === 'done') navigate(`/client/done/${qrId}`); },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-6">
      <Toasts toasts={toasts} onRemove={removeToast} />
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 w-36 h-36 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <div className="w-36 h-36 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 relative z-10">
              <CheckCircle2 className="w-20 h-20 text-white" />
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Votre véhicule est là !</h1>
          <p className="text-gray-500 mt-2">Sortez chercher votre véhicule</p>
          <p className="text-sm text-gray-400 mt-1">Remettez votre carte QR au voiturier</p>
        </div>
        {mission && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left space-y-2.5">
            {[
              ['Véhicule',  mission.vehicle.marque],
              ['Immatric.', mission.vehicle.immatriculation || '—'],
              ['Voiturier', mission.acceptedName || mission.valetName],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{l}</span>
                <span className="text-sm font-bold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        )}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2 text-center">Évaluez notre service</p>
          <div className="flex items-center justify-center gap-3">
            {[1,2,3,4,5].map(s => (
              <button key={s} className="text-3xl hover:scale-125 transition-transform">⭐</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ClientDone ──────────────────────────────────────────────
export function ClientDone() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="text-6xl">🎉</div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Merci !</h1>
          <p className="text-gray-500 mt-2">Votre mission est terminée</p>
          <p className="text-sm text-gray-400 mt-1">Votre carte QR est à nouveau disponible</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
          <p className="text-sm font-semibold text-gray-700">À bientôt !</p>
          <p className="text-xs text-gray-400">Conservez votre carte QR pour votre prochaine visite.</p>
        </div>
        <Link to="/client/accueil"
          className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all">
          <Home className="w-5 h-5" />Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
