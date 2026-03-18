import { users, otpStore, sessions, token, otp, userByToken } from '../data/store.js';

export async function authRoutes(ctx) {
  const { path, method, body, res } = ctx;

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    const user = users.find(u => u.email === body.email && u.password === body.password && ['admin','manager'].includes(u.role));
    if (!user) return res.json({ error: 'Email ou mot de passe incorrect' }, 401), true;
    const tk = token(); sessions.set(tk, user.id);
    return res.json({ token: tk, user: safeUser(user) }), true;
  }

  // POST /api/auth/otp/send
  if (path === '/api/auth/otp/send' && method === 'POST') {
    const user = users.find(u => u.phone === body.phone && u.role === 'valet');
    if (!user) return res.json({ error: 'Numéro non trouvé' }, 404), true;
    const code = otp();
    otpStore.set(body.phone, { code, expires: Date.now() + 5*60*1000, userId: user.id });
    console.log(`📱 OTP [${body.phone}]: ${code}`);
    return res.json({ success: true, _demo_code: code }), true;
  }

  // POST /api/auth/otp/verify
  if (path === '/api/auth/otp/verify' && method === 'POST') {
    const stored = otpStore.get(body.phone);
    if (!stored || Date.now() > stored.expires) return res.json({ error: 'Code expiré' }, 400), true;
    if (stored.code !== body.code) return res.json({ error: 'Code incorrect' }, 400), true;
    otpStore.delete(body.phone);
    const tk = token(); sessions.set(tk, stored.userId);
    const user = users.find(u => u.id === stored.userId);
    user.status = 'online';
    return res.json({ token: tk, user: safeUser(user) }), true;
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const user = userByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    return res.json({ user: safeUser(user) }), true;
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const user = userByToken(tk);
    if (user) user.status = 'offline';
    sessions.delete(tk);
    return res.json({ success: true }), true;
  }

  // GET /api/users
  if (path === '/api/users' && method === 'GET') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me) return res.json({ error: 'Non authentifié' }, 401), true;
    let result = users.filter(u => u.role === 'valet');
    if (me.role === 'manager') result = result.filter(u => u.managerId === me.id);
    return res.json({ users: result.map(safeUser) }), true;
  }

  // POST /api/users  — créer un voiturier
  if (path === '/api/users' && method === 'POST') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me) return res.json({ error: 'Non authentifié' }, 401), true;
    if (!['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const { name, phone } = body;
    if (!name || !phone) return res.json({ error: 'name et phone requis' }, 400), true;
    if (users.find(u => u.phone === phone)) return res.json({ error: 'Téléphone déjà utilisé' }, 400), true;
    const year = new Date().getFullYear();
    const idx = String(users.filter(u => u.role === 'valet').length + 1).padStart(3,'0');
    const valet = {
      id: `v${Date.now()}`, role: 'valet', name, phone,
      email: body.email || '', adresse: body.adresse || '', notes: body.notes || '',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      matricule: `V-${year}-${idx}`,
      managerId: me.role === 'manager' ? me.id : (body.managerId || me.id),
      status: 'offline',
    };
    users.push(valet);
    return res.json({ user: safeUser(valet) }, 201), true;
  }

  // GET /api/managers
  if (path === '/api/managers' && method === 'GET') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    return res.json({ managers: users.filter(u => u.role === 'manager').map(safeUser) }), true;
  }

  // POST /api/managers  — admin crée un manager
  if (path === '/api/managers' && method === 'POST') {
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const { name, email, password, phone } = body;
    if (!name || !email || !password) return res.json({ error: 'name, email et password requis' }, 400), true;
    if (users.find(u => u.email === email)) return res.json({ error: 'Email déjà utilisé' }, 400), true;
    const manager = {
      id: `mgr${Date.now()}`, role: 'manager', name, email, password, phone: phone || '',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      status: 'offline',
    };
    users.push(manager);
    return res.json({ manager: safeUser(manager) }, 201), true;
  }

  // PATCH /api/users/:id
  if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PATCH') {
    const uid = path.split('/')[3];
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me || !['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const user = users.find(u => u.id === uid);
    if (!user) return res.json({ error: 'Utilisateur non trouvé' }, 404), true;
    if (body.blocked   !== undefined) user.blocked   = body.blocked;
    if (body.name      !== undefined) user.name      = body.name;
    if (body.phone     !== undefined) user.phone     = body.phone;
    if (body.email     !== undefined) user.email     = body.email;
    if (body.managerId !== undefined) user.managerId = body.managerId;
    return res.json({ user: safeUser(user) }), true;
  }

  // DELETE /api/users/:id
  if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
    const uid = path.split('/')[3];
    const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();
    const me = userByToken(tk);
    if (!me || !['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const idx = users.findIndex(u => u.id === uid);
    if (idx === -1) return res.json({ error: 'Non trouvé' }, 404), true;
    users.splice(idx, 1);
    return res.json({ success: true }), true;
  }

  return false;
}

function safeUser(u) { const { password, ...s } = u; return s; }
