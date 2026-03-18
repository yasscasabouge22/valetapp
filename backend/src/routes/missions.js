import { missions, qrCards, users, uid, missionByQR } from '../data/store.js';
import { auth, matchPath } from '../middleware/auth.js';
import { send, broadcast } from '../sse.js';

// ─── Transitions autorisées ────────────────────────────────
const TRANSITIONS = {
  parking:  ['parked'],
  parked:   ['requested'],
  requested:['accepted'],
  accepted: ['returning'],
  returning:['arrived'],
  arrived:  ['done'],
};

export async function missionRoutes(ctx) {
  const { path, method, body, res } = ctx;

  // GET /api/missions  — toutes les missions actives (pour les voituriers)
  if (path === '/api/missions' && method === 'GET') {
    const user = auth(ctx);
    if (!user) return true;
    const active = missions.filter(m => m.status !== 'done');
    return res.json({ missions: active }), true;
  }

  // GET /api/missions/qr/:qrId  — PUBLIC, pour le client qui scanne
  const qrMatch = matchPath('/api/missions/qr/:qrId', path);
  if (qrMatch && method === 'GET') {
    const m = missionByQR(qrMatch.qrId);
    if (!m) return res.json({ error: 'Aucune mission active pour ce QR' }, 404), true;
    return res.json({ mission: m }), true;
  }

  // POST /api/missions  — voiturier crée une mission après scan QR
  if (path === '/api/missions' && method === 'POST') {
    const user = auth(ctx);
    if (!user) return true;

    const { qrId, vehicle, parkingLocation } = body;
    if (!qrId || !vehicle?.marque) return res.json({ error: 'qrId et vehicle requis' }, 400), true;

    const card = qrCards.find(q => q.id === qrId);
    if (!card) return res.json({ error: 'Carte QR invalide' }, 400), true;
    if (card.status === 'in_use') return res.json({ error: 'Cette carte est déjà en cours d\'utilisation' }, 400), true;

    // Vérifier qu'il n'existe pas déjà une mission active pour ce QR
    const existing = missionByQR(qrId);
    if (existing) return res.json({ error: 'Mission déjà en cours pour ce QR', mission: existing }, 409), true;

    const m = {
      id:             uid(),
      qrId,
      ticket:         '#' + qrId,
      valetId:        user.id,
      valetName:      user.name,
      vehicle: {
        marque:         vehicle.marque,
        couleur:        vehicle.couleur || '',
        immatriculation:vehicle.immatriculation || '',
        photo:          vehicle.photo || null,
      },
      // Géolocalisation du parking (saisie par le voiturier quand il stationne)
      parkingLocation: parkingLocation || null,
      // Géolocalisation du voiturier en temps réel (mise à jour lors du retour)
      valetLocation:   null,
      status:         'parking',
      createdAt:      new Date().toISOString(),
      updatedAt:      new Date().toISOString(),
      acceptedBy:     null, // id du voiturier qui a accepté la mission de retour
    };

    missions.unshift(m);
    card.status   = 'in_use';
    card.lastUsed = new Date().toISOString();

    // Notifier tous les voituriers qu'une nouvelle mission existe
    broadcast('mission_created', { mission: m });

    return res.json({ mission: m }, 201), true;
  }

  // PATCH /api/missions/:id/status  — changer le statut
  const statusMatch = matchPath('/api/missions/:id/status', path);
  if (statusMatch && method === 'PATCH') {
    // Certaines transitions viennent du client (requested), d'autres du valet
    const m = missions.find(x => x.id === statusMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;

    const { status } = body;

    if (!TRANSITIONS[m.status]?.includes(status)) {
      return res.json({ error: `Transition invalide : ${m.status} → ${status}` }, 400), true;
    }

    // La transition 'requested' peut venir du client (pas authentifié)
    // La transition 'accepted' nécessite un voiturier authentifié
    if (status === 'accepted') {
      const user = auth(ctx);
      if (!user) return true;
      m.acceptedBy   = user.id;
      m.acceptedName = user.name;
    }

    const prev = m.status;
    m.status    = status;
    m.updatedAt = new Date().toISOString();

    if (status === 'done') {
      // Libérer la carte QR
      const card = qrCards.find(q => q.id === m.qrId);
      if (card) card.status = 'available';
    }

    // ── NOTIFICATIONS CIBLÉES ─────────────────────────────
    // Client (canal = qrId)
    // Voiturier acceptant (canal = valetId)
    // Tous les valets (broadcast) si needed

    if (status === 'parked') {
      // Notifier le client : son véhicule est stationné
      send(m.qrId, 'notification', {
        type: 'parked',
        title: '🅿️ Véhicule stationné',
        body: `Votre ${m.vehicle.marque} est bien stationné. Scannez votre carte pour le récupérer quand vous voulez.`,
        mission: m,
      });
      // Mettre à jour le statut chez le client ET les valets
      send(m.qrId, 'mission_updated', { mission: m });
      broadcast('mission_updated', { mission: m });
    }

    else if (status === 'requested') {
      // Mettre à jour le statut chez le client
      send(m.qrId, 'mission_updated', { mission: m });
      // Notifier TOUS les voituriers
      broadcast('recovery_request', {
        type: 'recovery_request',
        title: '🔔 Demande de récupération !',
        body: `${m.vehicle.marque} ${m.vehicle.immatriculation} — Ticket ${m.ticket}`,
        mission: m,
        urgent: true,
      });
    }

    else if (status === 'accepted') {
      // Notifier + mettre à jour le statut chez le client
      send(m.qrId, 'notification', {
        type: 'accepted',
        title: '🚗 Un voiturier vient chercher votre véhicule',
        body: `${m.acceptedName} est en route. Vous pouvez suivre son arrivée en temps réel.`,
        mission: m,
      });
      send(m.qrId, 'mission_updated', { mission: m });
      // Notifier les autres valets : mission prise
      broadcast('mission_taken', { missionId: m.id, takenBy: m.acceptedName });
      broadcast('mission_updated', { mission: m });
    }

    else if (status === 'returning') {
      // Notifier + mettre à jour le statut chez le client
      send(m.qrId, 'notification', {
        type: 'returning',
        title: '🚗 Votre véhicule arrive !',
        body: `${m.acceptedName} ramène votre ${m.vehicle.marque}. Suivez-le sur la carte.`,
        mission: m,
        urgent: true,
      });
      send(m.qrId, 'mission_updated', { mission: m });
      broadcast('mission_updated', { mission: m });
    }

    else if (status === 'arrived') {
      // Notifier + mettre à jour le statut chez le client
      send(m.qrId, 'notification', {
        type: 'arrived',
        title: '✅ Votre véhicule est arrivé !',
        body: `Vous pouvez récupérer votre ${m.vehicle.marque}. Remettez votre carte QR au voiturier.`,
        mission: m,
        urgent: true,
      });
      send(m.qrId, 'mission_updated', { mission: m });
      broadcast('mission_updated', { mission: m });
    }

    else if (status === 'done') {
      // Notifier + mettre à jour le statut chez le client
      send(m.qrId, 'notification', {
        type: 'done',
        title: '🎉 Mission terminée',
        body: `Merci d'avoir utilisé notre service. À bientôt !`,
        mission: m,
      });
      send(m.qrId, 'mission_updated', { mission: m });
      broadcast('mission_done', { mission: m });
    }

    return res.json({ mission: m }), true;
  }

  // PATCH /api/missions/:id/location  — GPS update du voiturier (retour)
  const locMatch = matchPath('/api/missions/:id/location', path);
  if (locMatch && method === 'PATCH') {
    const user = auth(ctx);
    if (!user) return true;

    const m = missions.find(x => x.id === locMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;

    const { lat, lng, accuracy } = body;
    if (!lat || !lng) return res.json({ error: 'lat et lng requis' }, 400), true;

    m.valetLocation = { lat, lng, accuracy: accuracy || null, updatedAt: new Date().toISOString() };
    m.updatedAt = new Date().toISOString();

    // Envoyer la position au client en temps réel
    send(m.qrId, 'gps_update', {
      lat, lng,
      missionId: m.id,
      valetName: m.acceptedName || m.valetName,
    });

    return res.json({ ok: true }), true;
  }

  // PATCH /api/missions/:id/parking-location  — voiturier enregistre l'emplacement de stationnement
  const parkMatch = matchPath('/api/missions/:id/parking-location', path);
  if (parkMatch && method === 'PATCH') {
    const user = auth(ctx);
    if (!user) return true;

    const m = missions.find(x => x.id === parkMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;

    const { lat, lng, accuracy } = body;
    if (!lat || !lng) return res.json({ error: 'lat et lng requis' }, 400), true;

    m.parkingLocation = { lat, lng, accuracy: accuracy || null };
    m.updatedAt = new Date().toISOString();

    broadcast('mission_updated', { mission: m });
    return res.json({ ok: true, parkingLocation: m.parkingLocation }), true;
  }


  // PATCH /api/missions/:id/reassign  — manager réaffecte une mission à un autre voiturier
  const reassignMatch = matchPath('/api/missions/:id/reassign', path);
  if (reassignMatch && method === 'PATCH') {
    const user = auth(ctx);
    if (!user) return true;
    if (!['admin','manager'].includes(user.role)) return res.json({ error: 'Non autorisé' }, 403), true;

    const m = missions.find(x => x.id === reassignMatch.id);
    if (!m) return res.json({ error: 'Mission non trouvée' }, 404), true;
    if (m.status === 'done') return res.json({ error: 'Mission déjà terminée' }, 400), true;

    const { newValetId } = body;
    const newValet = users.find(u => u.id === newValetId && u.role === 'valet');
    if (!newValet) return res.json({ error: 'Voiturier introuvable' }, 404), true;

    const oldValetName = m.valetName;
    m.valetId   = newValet.id;
    m.valetName = newValet.name;
    m.updatedAt = new Date().toISOString();

    // Notifier le nouveau voiturier
    broadcast('mission_reassigned', {
      type: 'mission_reassigned',
      title: '🔄 Mission réaffectée',
      body: `La mission ${m.ticket} vous a été assignée par le manager.`,
      mission: m,
    });
    broadcast('mission_updated', { mission: m });

    return res.json({ mission: m, message: `Mission réaffectée de ${oldValetName} à ${newValet.name}` }), true;
  }

  return false;
}