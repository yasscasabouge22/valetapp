import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Home, Loader2, QrCode, Keyboard } from 'lucide-react';
import { api } from '../../api.js';
import { QRScanner } from '../../components/QRScanner.jsx';

export function UserClose() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [phase, setPhase]       = useState('choice'); // choice | scan | manual | closing | done
  const [error, setError]       = useState('');
  const [mission, setMission]   = useState(null);
  const [manualId, setManualId] = useState('');

  const handleScan = async (qrData) => {
    const scannedQrId = qrData.includes('/') ? qrData.split('/').pop() : qrData;
    await closeMission(scannedQrId);
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    await closeMission(manualId.trim().toUpperCase());
  };

  const closeMission = async (scannedQrId) => {
    setPhase('closing');
    setError('');
    try {
      const { missions } = await api.getMissions();
      const m = missions.find(x => x.id === id);
      if (!m) throw new Error('Mission non trouvée');
      if (m.qrId !== scannedQrId) {
        setError(`QR incorrect. Attendu : ${m.qrId} · Scanné : ${scannedQrId}`);
        setPhase('choice');
        return;
      }
      const { mission: closed } = await api.updateStatus(id, 'done');
      setMission(closed);
      setPhase('done');
    } catch (err) {
      setError(err.message);
      setPhase('choice');
    }
  };

  // ─── Écran succès ────────────────────────────────────────
  if (phase === 'done') return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-sm w-full">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 w-32 h-32 bg-emerald-100 rounded-full animate-ping opacity-20" />
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 relative z-10">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mission terminée !</h1>
          <p className="text-gray-500 text-sm mt-1">Le véhicule a été restitué avec succès</p>
        </div>
        {mission && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2 text-left">
            {[
              ['Ticket',    mission.ticket],
              ['Véhicule',  `${mission.vehicle.marque} · ${mission.vehicle.immatriculation}`],
              ['Durée',     (() => {
                const mins = Math.round((Date.now() - new Date(mission.createdAt).getTime()) / 60000);
                return mins < 60 ? `${mins} min` : `${Math.floor(mins/60)}h${String(mins%60).padStart(2,'0')}`;
              })()],
            ].map(([l, v]) => (
              <div key={l} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{l}</span>
                <span className="text-sm font-bold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => navigate('/user/scan')}
          className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
          <Home className="w-5 h-5" />Retour au tableau de bord
        </button>
      </div>
    </div>
  );

  // ─── Chargement ──────────────────────────────────────────
  if (phase === 'closing') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 animate-spin text-emerald-600" />
      <p className="text-gray-600 font-semibold">Clôture de la mission…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <h1 className="text-base font-bold text-gray-900 text-center">Clôture de mission</h1>
        <p className="text-xs text-gray-500 text-center mt-0.5">Vérifiez la carte QR du client</p>
      </div>

      <div className="p-4 space-y-4 max-w-sm mx-auto">

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-amber-800">📋 Récupérez la carte QR du client</p>
          <p className="text-xs text-amber-700 mt-1">
            Scannez-la avec votre caméra ou saisissez l'ID manuellement pour clôturer la mission.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-medium">
            ❌ {error}
          </div>
        )}

        {/* Choix méthode */}
        {phase === 'choice' && (
          <div className="space-y-3">
            <button onClick={() => { setPhase('scan'); setError(''); }}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-md shadow-emerald-100">
              <QrCode className="w-5 h-5" />
              Scanner avec la caméra
            </button>
            <button onClick={() => { setPhase('manual'); setError(''); }}
              className="w-full bg-white border-2 border-gray-200 text-gray-700 py-4 rounded-2xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              <Keyboard className="w-5 h-5" />
              Saisir l'ID manuellement
            </button>
          </div>
        )}

        {/* Scanner caméra */}
        {phase === 'scan' && (
          <div className="space-y-3">
            <QRScanner onScan={handleScan} onError={(e) => { setError(e); setPhase('choice'); }} active />
            <button onClick={() => setPhase('choice')}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">
              ← Retour
            </button>
          </div>
        )}

        {/* Saisie manuelle */}
        {phase === 'manual' && (
          <form onSubmit={handleManual} className="space-y-3">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <label className="text-sm font-bold text-gray-700 block">
                ID de la carte QR du client
              </label>
              <input
                type="text"
                value={manualId}
                onChange={e => setManualId(e.target.value.toUpperCase())}
                placeholder="ex: QR-001"
                autoFocus
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-base font-mono uppercase tracking-widest focus:outline-none focus:border-emerald-500 transition-all text-center"
              />
              <p className="text-xs text-gray-400 text-center">
                L'ID est imprimé sur la carte physique du client
              </p>
            </div>
            <button type="submit" disabled={!manualId.trim()}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md shadow-emerald-100">
              Confirmer la clôture
            </button>
            <button type="button" onClick={() => setPhase('choice')}
              className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700">
              ← Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
