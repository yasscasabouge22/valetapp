import { useEffect, useRef, useState } from 'react';

/**
 * QRScanner — utilise la caméra du téléphone pour scanner un QR code
 * Utilise jsQR (CDN) pour décoder
 */
export function QRScanner({ onScan, onError, active = true }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef    = useRef(null);
  const [status, setStatus] = useState('init'); // init | scanning | error

  useEffect(() => {
    if (!active) { stop(); return; }

    // Charger jsQR depuis CDN
    if (!window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';
      script.onload  = () => startCamera();
      script.onerror = () => { setStatus('error'); if (onError) onError('Impossible de charger le scanner'); };
      document.head.appendChild(script);
    } else {
      startCamera();
    }

    return stop;
  }, [active]);

  function startCamera() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setStatus('scanning');
          scanLoop();
        }
      })
      .catch(err => {
        setStatus('error');
        if (onError) onError(err.message || 'Accès caméra refusé');
      });
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR?.(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code?.data) {
        stop();
        if (onScan) onScan(code.data);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }

  function stop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 bg-red-50 rounded-2xl border border-red-200">
        <span className="text-3xl">📷</span>
        <p className="text-sm font-semibold text-red-700 text-center">Accès caméra non disponible</p>
        <p className="text-xs text-red-600 text-center">Autorisez l'accès à la caméra dans les réglages de votre navigateur</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black aspect-square w-full">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />

      {/* Cadre de scan */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-48 h-48">
          {/* Coins */}
          {['-top-0 -left-0', '-top-0 -right-0', '-bottom-0 -left-0', '-bottom-0 -right-0'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8 border-white ${
              i===0?'border-t-4 border-l-4 rounded-tl-lg':
              i===1?'border-t-4 border-r-4 rounded-tr-lg':
              i===2?'border-b-4 border-l-4 rounded-bl-lg':
              'border-b-4 border-r-4 rounded-br-lg'
            }`} />
          ))}
          {/* Ligne de scan animée */}
          <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 top-1/2 animate-bounce opacity-80" />
        </div>
      </div>

      {status === 'scanning' && (
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <span className="text-white text-xs bg-black/50 px-3 py-1 rounded-full">
            Pointez vers le QR code
          </span>
        </div>
      )}

      {status === 'init' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Démarrage de la caméra…</p>
          </div>
        </div>
      )}
    </div>
  );
}
