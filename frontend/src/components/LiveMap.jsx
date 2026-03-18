import { useEffect, useRef } from 'react';

// Calcule la distance en mètres entre deux coordonnées GPS (formule Haversine)
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * LiveMap — affiche une carte avec marqueurs via OpenStreetMap + Leaflet
 * Props :
 *   valetPos   : { lat, lng }  — position voiturier (mise à jour en temps réel)
 *   clientPos  : { lat, lng }  — position client / destination
 *   className  : string
 */
export function LiveMap({ valetPos, clientPos, className = '' }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const valetMarker  = useRef(null);
  const clientMarker = useRef(null);
  const polyline     = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Charger Leaflet dynamiquement
    if (!window.L) {
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      initMap();
    }

    function initMap() {
      if (mapRef.current) return;
      const L = window.L;
      const center = valetPos || clientPos || { lat: 33.5731, lng: -7.5898 };

      const map = L.map(containerRef.current, { zoomControl: true, attributionControl: false });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      map.setView([center.lat, center.lng], 15);
      mapRef.current = map;

      // Icône voiturier
      const valetIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px">🚗</div>`,
        iconSize: [40,40], iconAnchor: [20,20], className: '',
      });

      // Icône client
      const clientIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;background:#10b981;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px">📍</div>`,
        iconSize: [40,40], iconAnchor: [20,40], className: '',
      });

      if (valetPos) {
        valetMarker.current  = L.marker([valetPos.lat, valetPos.lng],  { icon: valetIcon  }).addTo(map);
      }
      if (clientPos) {
        clientMarker.current = L.marker([clientPos.lat, clientPos.lng], { icon: clientIcon }).addTo(map);
      }

      // Ligne entre les deux
      if (valetPos && clientPos) {
        polyline.current = L.polyline([[valetPos.lat, valetPos.lng],[clientPos.lat, clientPos.lng]], {
          color: '#3b82f6', weight: 3, dashArray: '6 6', opacity: 0.7,
        }).addTo(map);
        map.fitBounds(polyline.current.getBounds(), { padding: [40, 40] });
      }
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; valetMarker.current = null; clientMarker.current = null; }
    };
  }, []); // eslint-disable-line

  // Mise à jour de la position voiturier en temps réel
  useEffect(() => {
    if (!mapRef.current || !window.L || !valetPos) return;
    const L = window.L;
    const latlng = [valetPos.lat, valetPos.lng];

    if (valetMarker.current) {
      valetMarker.current.setLatLng(latlng);
    } else {
      const valetIcon = L.divIcon({
        html: `<div style="width:40px;height:40px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:18px">🚗</div>`,
        iconSize: [40,40], iconAnchor: [20,20], className: '',
      });
      valetMarker.current = L.marker(latlng, { icon: valetIcon }).addTo(mapRef.current);
    }

    // Mettre à jour la polyline
    if (clientPos && polyline.current) {
      polyline.current.setLatLngs([[valetPos.lat, valetPos.lng],[clientPos.lat, clientPos.lng]]);
    } else if (clientPos && !polyline.current) {
      polyline.current = L.polyline([[valetPos.lat, valetPos.lng],[clientPos.lat, clientPos.lng]], {
        color: '#3b82f6', weight: 3, dashArray: '6 6', opacity: 0.7,
      }).addTo(mapRef.current);
    }

    // Recadrer la carte
    if (clientPos) {
      mapRef.current.fitBounds([[valetPos.lat, valetPos.lng],[clientPos.lat, clientPos.lng]], { padding: [40, 40] });
    } else {
      mapRef.current.setView(latlng, 15);
    }
  }, [valetPos, clientPos]);

  return <div ref={containerRef} className={className} style={{ zIndex: 1 }} />;
}
