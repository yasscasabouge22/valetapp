// Détecte automatiquement le host — fonctionne sur Mac ET sur téléphone du même réseau
const BASE = '';  // Vercel proxy redirige /api/* vers Railway

// SSE pointe directement vers le backend (même host, port 3001)
// Pas de proxy Vite = pas de problème CORS ni de timeout
const SSE_BASE = 'https://valetapp-production.up.railway.app';

function getToken() { return localStorage.getItem('vt_token') || ''; }

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur serveur'), { status: res.status, data });
  return data;
}

export const api = {
  // Auth
  sendOTP:   (phone)       => req('POST', '/api/auth/otp/send',   { phone }),
  verifyOTP: (phone, code) => req('POST', '/api/auth/otp/verify', { phone, code }),
  me:        ()            => req('GET',  '/api/auth/me'),
  logout:    ()            => req('POST', '/api/auth/logout'),

  // Missions
  getMissions:         ()             => req('GET',  '/api/missions'),
  getMissionByQR:      (qrId)         => req('GET',  `/api/missions/qr/${qrId}`),
  createMission:       (data)         => req('POST', '/api/missions', data),
  updateStatus:        (id, status)   => req('PATCH', `/api/missions/${id}/status`, { status }),
  updateLocation:      (id, lat, lng, accuracy) =>
                                          req('PATCH', `/api/missions/${id}/location`, { lat, lng, accuracy }),
  saveParkingLocation: (id, lat, lng, accuracy) =>
                                          req('PATCH', `/api/missions/${id}/parking-location`, { lat, lng, accuracy }),

  // SSE — pointe directement vers le backend (port 3001)
  sseValet:  () => `${SSE_BASE}/api/events?token=${getToken()}`,
  sseClient: (qrId) => `${SSE_BASE}/api/events?qr=${encodeURIComponent(qrId)}`,
};