import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { AdminLayout } from '../shared/Layout.jsx';
import { Plus, Download, Ban, Trash2, Eye, X, Loader2 } from 'lucide-react';

const BACKEND = `${location.protocol}//${location.hostname}:3001`;
const apiFetch = (path, opts = {}) => {
  const token = localStorage.getItem('vt_token');
  return fetch(`${BACKEND}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) } }).then(r => r.json());
};

const APP_URL = `${location.protocol}//${location.hostname}:${location.port || (location.protocol === 'https:' ? 443 : 5173)}`;

const STATUS_STYLE = { available:'bg-emerald-100 text-emerald-700 border-emerald-200', in_use:'bg-blue-100 text-blue-700 border-blue-200', disabled:'bg-red-100 text-red-600 border-red-200' };
const STATUS_LABEL = { available:'Disponible', in_use:'En mission', disabled:'Désactivé' };

function downloadSVG(qrId) {
  const svgEl = document.getElementById(`qr-svg-${qrId}`);
  if (!svgEl) return;
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${qrId}.svg`;
  a.click();
}

function downloadPNG(qrId) {
  const canvas = document.getElementById(`qr-canvas-${qrId}`);
  if (!canvas) return;
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${qrId}.png`;
  a.click();
}

async function downloadZIP(cards) {
  // Simple ZIP using streams API (no external lib needed for modern browsers)
  // Fallback: download each as PNG individually
  for (const card of cards) {
    const canvas = document.getElementById(`qr-canvas-${card.id}`);
    if (!canvas) continue;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${card.id}.png`;
    a.click();
    await new Promise(r => setTimeout(r, 200));
  }
}

export function AdminQRCodes() {
  const [qrCards,    setQrCards]    = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [showGen,    setShowGen]    = useState(false);
  const [qty,        setQty]        = useState('10');
  const [generating, setGenerating] = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch('/api/qrcodes');
      setQrCards(data.qrCards || []);
    } catch {}
    setLoading(false);
  }

  const filtered = filter === 'all' ? qrCards : qrCards.filter(q => q.status === filter);

  const stats = {
    available: qrCards.filter(q => q.status === 'available').length,
    inUse:     qrCards.filter(q => q.status === 'in_use').length,
    disabled:  qrCards.filter(q => q.status === 'disabled').length,
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await apiFetch('/api/qrcodes/generate', { method: 'POST', body: JSON.stringify({ count: parseInt(qty) }) });
      if (data.cards) setQrCards(p => [...data.cards, ...p]);
    } catch {}
    setGenerating(false);
    setShowGen(false);
  };

  const handleDisable = async (id) => {
    await apiFetch(`/api/qrcodes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) });
    setQrCards(p => p.map(q => q.id === id ? { ...q, status: 'disabled' } : q));
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette carte ? Action irréversible.')) return;
    await apiFetch(`/api/qrcodes/${id}`, { method: 'DELETE' });
    setQrCards(p => p.filter(q => q.id !== id));
  };

  const ticketUrl = (id) => `${APP_URL}/client/ticket/${id}`;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-5 max-w-6xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Cartes QR</h1>
            <p className="text-sm text-gray-500">{qrCards.length} cartes générées</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => downloadZIP(filtered.slice(0,20))}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors">
              <Download className="w-4 h-4" />Exporter ZIP
            </button>
            <button onClick={() => setShowGen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm">
              <Plus className="w-4 h-4" />Générer des cartes
            </button>
          </div>
        </div>

        {/* Compteurs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Disponibles', value:stats.available, color:'text-emerald-600', bg:'bg-emerald-50' },
            { label:'En mission',  value:stats.inUse,     color:'text-blue-600',    bg:'bg-blue-50' },
            { label:'Désactivées', value:stats.disabled,  color:'text-red-600',     bg:'bg-red-50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {[['all','Toutes'],['available','Disponibles'],['in_use','En mission'],['disabled','Désactivées']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${filter===v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>
        ) : (
          <>
            {/* Canvases cachés pour export PNG */}
            <div className="hidden">
              {qrCards.map(qr => (
                <QRCodeCanvas key={qr.id} id={`qr-canvas-${qr.id}`} value={ticketUrl(qr.id)} size={300} level="H" />
              ))}
            </div>

            {/* Grille QR */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map(qr => (
                <div key={qr.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                  <div className="bg-gray-50 p-4 flex items-center justify-center">
                    <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                      <QRCodeSVG
                        id={`qr-svg-${qr.id}`}
                        value={ticketUrl(qr.id)}
                        size={72} level="H"
                        fgColor={qr.status === 'disabled' ? '#d1d5db' : '#111827'}
                      />
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-bold text-gray-900 text-xs font-mono text-center tracking-wider">{qr.id}</p>
                    <div className="flex justify-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_STYLE[qr.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {STATUS_LABEL[qr.status] || qr.status}
                      </span>
                    </div>
                    {qr.lastUsed && <p className="text-[10px] text-gray-400 text-center">{new Date(qr.lastUsed).toLocaleDateString('fr-MA')}</p>}
                    {/* Actions */}
                    <div className="flex items-center justify-center gap-0.5 pt-1 border-t border-gray-100">
                      <button onClick={() => setPreview(qr.id)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Aperçu carte">
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                      </button>
                      <button onClick={() => downloadSVG(qr.id)} className="p-1.5 hover:bg-emerald-50 rounded-lg" title="Télécharger SVG">
                        <Download className="w-3.5 h-3.5 text-emerald-500" />
                      </button>
                      <button onClick={() => downloadPNG(qr.id)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Télécharger PNG (300dpi)">
                        <span className="text-[10px] font-bold text-gray-400">PNG</span>
                      </button>
                      <button onClick={() => handleDisable(qr.id)} disabled={qr.status === 'in_use'} className="p-1.5 hover:bg-orange-50 rounded-lg disabled:opacity-30" title="Désactiver">
                        <Ban className="w-3.5 h-3.5 text-orange-500" />
                      </button>
                      <button onClick={() => handleDelete(qr.id)} disabled={qr.status === 'in_use'} className="p-1.5 hover:bg-red-50 rounded-lg disabled:opacity-30" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400">
                  <p className="text-4xl mb-3">🎫</p>
                  <p className="text-sm font-semibold">Aucune carte dans cette catégorie</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal générer */}
      {showGen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => !generating && setShowGen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl z-50 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Générer des cartes QR</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Nombre de cartes</label>
                <div className="grid grid-cols-3 gap-3">
                  {['10','50','100'].map(n => (
                    <button key={n} onClick={() => setQty(n)}
                      className={`py-4 rounded-xl border-2 font-bold text-2xl transition-all ${qty===n ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                💡 Chaque carte encode l'URL : <br/>
                <span className="font-mono break-all">{APP_URL}/client/ticket/QR-XXX</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowGen(false)} disabled={generating} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold disabled:opacity-50">Annuler</button>
                <button onClick={handleGenerate} disabled={generating}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2">
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" />Génération…</> : `Générer ${qty} cartes`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal aperçu — format carte physique 85.6x54mm */}
      {preview && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            <div className="bg-white rounded-2xl shadow-2xl z-50 p-6 w-80" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900">Aperçu carte physique</h2>
                <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-4 h-4 text-gray-600" /></button>
              </div>
              {/* Format carte bancaire 85.6×54mm — ratio 1.586 */}
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-md" style={{ aspectRatio: '1.586' }}>
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="bg-emerald-600 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-bold">🚗 Service Voiturier</span>
                    <span className="text-white/70 text-[10px]">Valet Parking</span>
                  </div>
                  {/* QR centré */}
                  <div className="flex-1 flex items-center justify-center gap-4 px-4">
                    <div className="bg-white p-1.5 rounded-lg border border-gray-100 shadow-sm">
                      <QRCodeSVG value={ticketUrl(preview)} size={70} level="H" fgColor="#111827" />
                    </div>
                    <div className="text-center">
                      <p className="font-mono font-bold text-gray-900 text-sm">{preview}</p>
                      <p className="text-[9px] text-gray-400 leading-tight mt-1">Scannez pour<br/>accéder à votre ticket</p>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-1.5 text-center">
                    <p className="text-[9px] text-gray-400">Conservez cette carte · À remettre au voiturier</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => downloadSVG(preview)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200">
                  <Download className="w-3.5 h-3.5" />SVG
                </button>
                <button onClick={() => downloadPNG(preview)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                  <Download className="w-3.5 h-3.5" />PNG 300dpi
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
