import { useEffect, useRef, useState } from 'react';

export function useGPS({ onUpdate, enabled = true, interval = 5000 }) {
  const [position, setPosition] = useState(null);
  const [error, setError]       = useState(null);
  const watchId = useRef(null);
  const lastSent = useRef(0);
  const cbRef = useRef(onUpdate);
  cbRef.current = onUpdate;

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      if (!navigator.geolocation) setError('Géolocalisation non disponible');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setPosition(loc);
        setError(null);
        // Throttle les envois au serveur
        const now = Date.now();
        if (now - lastSent.current >= interval) {
          lastSent.current = now;
          if (cbRef.current) cbRef.current(loc);
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled, interval]);

  // Capture une position unique (pour enregistrer le parking)
  const captureOnce = () => new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });

  return { position, error, captureOnce };
}
