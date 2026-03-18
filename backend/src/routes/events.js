import { registerSSE } from '../sse.js';
import { getUserByToken, getQRCards, getQRCard, updateQRCard, createQRCards } from '../data/store.js';

export async function eventRoutes(ctx) {
  const { path, method, req, res, query, body } = ctx;
  const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();

  // GET /api/events  — SSE
  if (path === '/api/events' && method === 'GET') {
    const { token, qr } = query;
    if (qr) { registerSSE(req, res, qr); return true; }
    if (!token) { res.writeHead(401); res.end(JSON.stringify({ error: 'token requis' })); return true; }
    const user = await getUserByToken(token);
    if (!user) { res.writeHead(401); res.end(JSON.stringify({ error: 'Token invalide' })); return true; }
    registerSSE(req, res, user.id);
    return true;
  }

  // GET /api/qr/:id/check
  if (path.match(/^\/api\/qr\/[^/]+\/check$/) && method === 'GET') {
    const qrId = path.split('/')[3];
    const card = await getQRCard(qrId);
    if (!card) return res.json({ valid: false, error: 'Carte inconnue' }), true;
    return res.json({ valid: true, card }), true;
  }

  // GET /api/qrcodes
  if (path === '/api/qrcodes' && method === 'GET') {
    const qrCards = await getQRCards();
    const stats = {
      available: qrCards.filter(q => q.status === 'available').length,
      inUse:     qrCards.filter(q => q.status === 'in_use').length,
      disabled:  qrCards.filter(q => q.status === 'disabled').length,
    };
    return res.json({ qrCards, stats }), true;
  }

  // POST /api/qrcodes/generate
  if (path === '/api/qrcodes/generate' && method === 'POST') {
    const me = await getUserByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const count = Math.min(parseInt(body.count) || 10, 100);
    const existing = await getQRCards();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const num = String(existing.length + i + 1).padStart(3, '0');
      ids.push('QR-' + num);
    }
    const newCards = await createQRCards(ids);
    return res.json({ cards: newCards }), true;
  }

  // PATCH /api/qrcodes/:id
  if (path.match(/^\/api\/qrcodes\/[^/]+$/) && method === 'PATCH') {
    const qrId = path.split('/')[3];
    const card = await updateQRCard(qrId, body);
    if (!card) return res.json({ error: 'Carte non trouvée' }, 404), true;
    return res.json({ card }), true;
  }

  // DELETE /api/qrcodes/:id
  if (path.match(/^\/api\/qrcodes\/[^/]+$/) && method === 'DELETE') {
    const me = await getUserByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const qrId = path.split('/')[3];
    const { error } = await (await import('../data/store.js')).supabase.from('qr_cards').delete().eq('id', qrId);
    if (error) return res.json({ error: 'Erreur suppression' }, 500), true;
    return res.json({ success: true }), true;
  }

  return false;
}
