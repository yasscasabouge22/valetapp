import { getUserByToken } from '../data/store.js';

export async function auth(ctx) {
  const t = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!t) { ctx.res.json({ error: 'Non authentifié' }, 401); return null; }
  const u = await getUserByToken(t);
  if (!u) { ctx.res.json({ error: 'Token invalide' }, 401); return null; }
  return u;
}

export function matchPath(pattern, path) {
  const pp = pattern.split('/'), rp = path.split('/');
  if (pp.length !== rp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) params[pp[i].slice(1)] = rp[i];
    else if (pp[i] !== rp[i]) return null;
  }
  return params;
}
