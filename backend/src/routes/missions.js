import { getMissions, getMissionById, getMissionByQR, createMission, updateMission, getQRCard, updateQRCard, getUserByToken, getUsers, uid } from '../data/store.js';
import { matchPath } from '../middleware/auth.js';
import { send, broadcast } from '../sse.js';

const TRANSITIONS = {
  parking:['parked'], parked:['requested'], requested:['accepted'],
  accepted:['returning'], returning:['arrived'], arrived:['done'],
};

function missionToClient(m) {
  if (!m) return null;
  return {
    id: m.id, qrId: m.qr_id, ticket: m.ticket,
    valetId: m.valet_id, valetName: m.valet_name,
    vehicle: { marque: m.vehicle_marque, couleur: m.vehicle_couleur, immatriculation: m.vehicle_immatriculation, photo: m.vehicle_photo },
    parkingLocation: m.parking_lat ? { lat: m.parking_lat, lng: m.parking_lng } : null,
    valetLocation: m.valet_lat ? { lat: m.valet_lat, lng: m.valet_lng } : null,
    status: m.status, acceptedBy: m.accepted_by, acceptedName: m.accepted_name,
    createdAt: m.created_at, updatedAt: m.updated_at,
  };
}

export async function missionRoutes(ctx) {
  const { path, method, body, res } = ctx;
  const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();

  // GET /api/missions
  if (path === '/api/missions' && method === 'GET') {
    const user = await getUserByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    const all = await getMissions();
    const active = all.filter(m => m.status !== 'done');
    return res.json({ missions: active.map(missionToClient) }), true;
  }

  // GET /api/missions/qr/:qrId
  const qrMatch = matchPath('/api/missions/qr/:qrId', path);
  if (qrMatch && method === 'GET') {
    const m = await getMissionByQR(qrMatch.qrId);
    if (!m) return res.json({ error: 'Aucune mission active pour ce QR' }, 404), true;
    return res.json({ mission: missionToClient(m) }), true;
  }

  // POST /api/missions
  if (path === '/api/missions' && method === 'POST') {
    const user = await getUserByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    const { qrId, vehicle } = body;
    if (!qrId || !vehicle?.marque) return res.json({ error: 'qrId et vehicle requis' }, 400), true;
    const card = await getQRCard(qrId);
    if (!card) return res.json({ error: 'Carte QR invalide' }, 400), true;
    if (card.status === 'in_use') return res.json({ error: "Cette carte est déjà en cours d'utilisation" }, 400), true;
    const existing = await getMissionByQR(qrId);
    if (existing) return res.json({ error: 'Mission déjà en cours', mission: missionToClient(existing) }, 409), true;
    const m = {
      id: uid(), qr_id: qrId, ticket: '#' + qrId,
      valet_id: user.id, valet_name: user.name,
      vehicle_marque: vehicle.marque, vehicle_couleur: vehicle.couleur || '',
      vehicle_immatriculation: vehicle.immatriculation || '', vehicle_photo: vehicle.photo || null,
      status: 'parking',
    };
    const created = await createMission(m);
    await updateQRCard(qrId, { status: 'in_use', last_used: new Date().toISOString() });
    broadcast('mission_created', { mission: missionToClient(created) });
    return res.json({ mission: missionToClient(created) }, 201), true;
  }

  // PATCH /api/missions/:id/status
  const statusMatch = matchPath('/api/missions/:id/status', path);
  if (statusMatch && method === 'PATCH') {
    const m = await getMissionById(statusMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;
    const { status } = body;
    if (!TRANSITIONS[m.status]?.includes(status))
      return res.json({ error: `Transition invalide : ${m.status} → ${status}` }, 400), true;
    const updates = { status };
    if (status === 'accepted') {
      const user = await getUserByToken(tk);
      if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
      updates.accepted_by = user.id;
      updates.accepted_name = user.name;
    }
    if (status === 'done') {
      await updateQRCard(m.qr_id, { status: 'available' });
    }
    const updated = await updateMission(statusMatch.id, updates);
    const mc = missionToClient(updated);
    if (status === 'parked') { send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('mission_updated', { mission: mc }); }
    else if (status === 'requested') { send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('recovery_request', { mission: mc, urgent: true, title: '🔔 Demande de récupération !', body: `${m.vehicle_marque} ${m.vehicle_immatriculation}` }); }
    else if (status === 'accepted') { send(m.qr_id, 'notification', { type: 'accepted', title: '🚗 Un voiturier vient chercher votre véhicule', mission: mc }); send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('mission_updated', { mission: mc }); }
    else if (status === 'returning') { send(m.qr_id, 'notification', { type: 'returning', title: '🚗 Votre véhicule arrive !', mission: mc }); send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('mission_updated', { mission: mc }); }
    else if (status === 'arrived') { send(m.qr_id, 'notification', { type: 'arrived', title: '✅ Votre véhicule est arrivé !', mission: mc }); send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('mission_updated', { mission: mc }); }
    else if (status === 'done') { send(m.qr_id, 'notification', { type: 'done', title: '🎉 Mission terminée', mission: mc }); send(m.qr_id, 'mission_updated', { mission: mc }); broadcast('mission_done', { mission: mc }); }
    return res.json({ mission: mc }), true;
  }

  // PATCH /api/missions/:id/location
  const locMatch = matchPath('/api/missions/:id/location', path);
  if (locMatch && method === 'PATCH') {
    const user = await getUserByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    const { lat, lng } = body;
    if (!lat || !lng) return res.json({ error: 'lat et lng requis' }, 400), true;
    const m = await getMissionById(locMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;
    await updateMission(locMatch.id, { valet_lat: lat, valet_lng: lng });
    send(m.qr_id, 'gps_update', { lat, lng, missionId: m.id, valetName: m.accepted_name || m.valet_name });
    return res.json({ ok: true }), true;
  }

  // PATCH /api/missions/:id/parking-location
  const parkMatch = matchPath('/api/missions/:id/parking-location', path);
  if (parkMatch && method === 'PATCH') {
    const user = await getUserByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    const { lat, lng } = body;
    if (!lat || !lng) return res.json({ error: 'lat et lng requis' }, 400), true;
    const updated = await updateMission(parkMatch.id, { parking_lat: lat, parking_lng: lng });
    broadcast('mission_updated', { mission: missionToClient(updated) });
    return res.json({ ok: true }), true;
  }

  // PATCH /api/missions/:id/reassign
  const reassignMatch = matchPath('/api/missions/:id/reassign', path);
  if (reassignMatch && method === 'PATCH') {
    const user = await getUserByToken(tk);
    if (!user || !['admin','manager'].includes(user.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const m = await getMissionById(reassignMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;
    if (m.status === 'done') return res.json({ error: 'Mission déjà terminée' }, 400), true;
    const { newValetId } = body;
    const all = await getUsers();
    const newValet = all.find(u => u.id === newValetId && u.role === 'valet');
    if (!newValet) return res.json({ error: 'Voiturier introuvable' }, 404), true;
    const updated = await updateMission(reassignMatch.id, { valet_id: newValet.id, valet_name: newValet.name });
    const mc = missionToClient(updated);
    broadcast('mission_reassigned', { mission: mc });
    broadcast('mission_updated', { mission: mc });
    return res.json({ mission: mc, message: `Mission réaffectée à ${newValet.name}` }), true;
  }

  return false;
}
