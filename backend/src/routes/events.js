import { registerSSE } from '../sse.js';
import { sessions, users, qrCards, uid } from '../data/store.js';

function userByToken(t) {
  const id = sessions.get(t);
  return id ? users.find(u => u.id === id) || null : null;
}

export async function eventRoutes(ctx) {
  const { path, method, req, res, query, body } = ctx;

  // GET /api/events  — SSE
  if (path === '/api/events' && method === 'GET') {
    const { token, qr } = query;
    if (qr) { registerSSE(req, res, qr); return true; }
    if (!token) { res.writeHead(401); res.end(JSON.stringify({ error: 'token requis' })); return true; }
    const userId = sessions.get(token);
    if (!userId) { res.writeHead(401); res.end(JSON.stringify({ error: 'Token invalide' })); return true; }
    registerSSE(req, res, userId);
    return true;
  }

  // GET /api/qr/:id/check
  if (path.match(/^\/api\/qr\/[^/]+\/check$/) && method === 'GET') {
    const qrId = path.split('/')[3];
    const card = qrCards.find(q => q.id === qrId);
    if (!card) return res.json({ valid: false, error: 'Carte inconnue' }), true;
    return res.json({ valid: true, card }), true;
  }

  // GET /api/qrcodes
  if (path === '/api/qrcodes' && method === 'GET') {
    const stats = {
      available: qrCards.filter(q => q.status === 'available').length,
      inUse:     qrCards.filter(q => q.status === 'in_use').length,
      disabled:  qrCards.filter(q => q.status === 'disabled').length,
    };
    return res.json({ qrCards, stats }), true;
  }

  // POST /api/qrcodes/generate
  if (path === '/api/qrcodes/generate' && method === 'POST') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const count = Math.min(parseInt(body.count) || 10, 100);
    const newCards = [];
    for (let i = 0; i < count; i++) {
      const num = String(qrCards.length + i + 1).padStart(3, '0');
      const card = { id: `QR-${num}`, status: 'available', lastUsed: null, createdAt: new Date().toISOString() };
      qrCards.push(card);
      newCards.push(card);
    }
    return res.json({ cards: newCards }), true;
  }

  // PATCH /api/qrcodes/:id
  if (path.match(/^\/api\/qrcodes\/[^/]+$/) && method === 'PATCH') {
    const qrId = path.split('/')[3];
    const card = qrCards.find(q => q.id === qrId);
    if (!card) return res.json({ error: 'Carte non trouvée' }, 404), true;
    if (body.status) card.status = body.status;
    return res.json({ card }), true;
  }

  // DELETE /api/qrcodes/:id
  if (path.match(/^\/api\/qrcodes\/[^/]+$/) && method === 'DELETE') {
    const qrId = path.split('/')[3];
    const idx = qrCards.findIndex(q => q.id === qrId);
    if (idx === -1) return res.json({ error: 'Carte non trouvée' }, 404), true;
    qrCards.splice(idx, 1);
    return res.json({ success: true }), true;
  }

  return false;
}
