import { useState, useEffect, useRef } from 'react';
import { ManagerLayout } from '../shared/Layout.jsx';
import { api } from '../../api.js';
import { useSSE } from '../../hooks/useSSE.js';

const STATUS_COLOR = { returning: '#3b82f6', accepted: '#8b5cf6', parking: '#f59e0b', parked: '#10b981' };
const STATUS_LABEL = { returning: 'En retour', accepted: 'Acceptée', parking: 'Stationnement', parked: 'Stationné' };

export function ManagerMap() {
  const [missions,    setMissions]    = useState([]);
  const [valetPos,    setValetPos]    = useState({}); // valetId → {lat, lng}
  const [filterStatus, setFilter]    = useState('all');
  const mapRef    = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef({});
  const token = localStorage.getItem('vt_token');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { missions: ms } = await api.getMissions();
      setMissions(ms.filter(m => m.status !== 'done') || []);
    } catch {}
  }

  // Initialiser Leaflet
  useEffect(() => {
    if (!containerRef.current) return;
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else { initMap(); }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  function initMap() {
    if (mapRef.current) return;
    const L = window.L;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([33.5731, -7.5898], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    mapRef.current = map;
    updateMarkers();
  }

  // Mettre à jour les marqueurs sur la carte
  const updateMarkers = () => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;
    const map = mapRef.current;

    // Supprimer anciens marqueurs
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const visible = missions.filter(m => filterStatus === 'all' || m.status === filterStatus);
    visible.forEach(m => {
      const pos = valetPos[m.valetId] || valetPos[m.acceptedBy];
      if (!pos && !m.parkingLocation) return;
      const location = pos || m.parkingLocation;
      const color = STATUS_COLOR[m.status] || '#6b7280';
      const icon = L.divIcon({
        html: `<div style="width:36px;height:36px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px">🚗</div>`,
        iconSize: [36,36], iconAnchor: [18,18], className: '',
      });
      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>${m.ticket}</b><br>${m.vehicle.marque}<br>${m.valetName}<br><span style="color:${color}">${STATUS_LABEL[m.status] || m.status}</span>`);
      markersRef.current[m.id] = marker;
    });

    if (Object.keys(markersRef.current).length > 0) {
      const group = L.featureGroup(Object.values(markersRef.current));
      map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
  };

  useEffect(() => { updateMarkers(); }, [missions, valetPos, filterStatus]);

  useSSE(token ? api.sseValet() : null, {
    mission_updated: ({ mission }) => setMissions(p => p.map(m => m.id === mission.id ? mission : m)),
    mission_done:    ({ mission }) => setMissions(p => p.filter(m => m.id !== mission.id)),
    gps_update:      ({ lat, lng, missionId }) => {
      const m = missions.find(x => x.id === missionId);
      if (m) setValetPos(p => ({ ...p, [m.acceptedBy || m.valetId]: { lat, lng } }));
    },
  });

  const active = missions.filter(m => filterStatus === 'all' || m.status === filterStatus);

  return (
    <ManagerLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-base font-bold text-gray-900">🗺️ Carte en temps réel</h1>
            <p className="text-xs text-gray-500">{active.length} véhicule{active.length > 1 ? 's' : ''} sur la carte</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[['all','Tous'],['returning','En retour'],['parked','Stationnés'],['accepted','Acceptées']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${filterStatus===v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{l}
              </button>
            ))}
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 relative" style={{ minHeight: 300 }}>
          <div ref={containerRef} className="w-full h-full" style={{ minHeight: 300 }} />
          {active.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
              <p className="text-gray-500 text-sm font-semibold">Aucun véhicule actif</p>
            </div>
          )}
        </div>

        {/* Liste des missions actives */}
        <div className="bg-white border-t border-gray-100 p-4 max-h-48 overflow-y-auto">
          <div className="flex gap-3 flex-wrap">
            {active.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[m.status] || '#9ca3af' }} />
                <span className="text-xs font-bold text-gray-900">{m.ticket}</span>
                <span className="text-xs text-gray-500">{m.vehicle.marque}</span>
                <span className="text-xs text-gray-400">· {m.valetName}</span>
              </div>
            ))}
            {active.length === 0 && <p className="text-xs text-gray-400">Aucune mission active en ce moment</p>}
          </div>
        </div>
      </div>
    </ManagerLayout>
  );
}
