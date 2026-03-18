import { getUserByEmail, getUserByPhone, getUserByToken, createSession, deleteSession, getUsers, createUser, updateUser, deleteUser, saveOTP, getOTP, deleteOTP, otp, token, uid } from '../data/store.js';

function safeUser(u) {
  if (!u) return null;
  const { password, ...s } = u;
  return s;
}

export async function authRoutes(ctx) {
  const { path, method, body, res } = ctx;
  const tk = (ctx.req.headers['authorization'] || '').replace('Bearer ', '').trim();

  // POST /api/auth/login
  if (path === '/api/auth/login' && method === 'POST') {
    const user = await getUserByEmail(body.email);
    if (!user || user.password !== body.password || !['admin','manager'].includes(user.role))
      return res.json({ error: 'Email ou mot de passe incorrect' }, 401), true;
    const t = token();
    await createSession(t, user.id);
    return res.json({ token: t, user: safeUser(user) }), true;
  }

  // POST /api/auth/otp/send
  if (path === '/api/auth/otp/send' && method === 'POST') {
    const user = await getUserByPhone(body.phone);
    if (!user || user.role !== 'valet') return res.json({ error: 'Numéro non trouvé' }, 404), true;
    const code = otp();
    await saveOTP(body.phone, code, user.id);
    console.log(`📱 OTP [${body.phone}]: ${code}`);
    return res.json({ success: true, _demo_code: code }), true;
  }

  // POST /api/auth/otp/verify
  if (path === '/api/auth/otp/verify' && method === 'POST') {
    const stored = await getOTP(body.phone);
    if (!stored || new Date() > new Date(stored.expires_at))
      return res.json({ error: 'Code expiré' }, 400), true;
    if (stored.code !== body.code)
      return res.json({ error: 'Code incorrect' }, 400), true;
    await deleteOTP(body.phone);
    const t = token();
    await createSession(t, stored.user_id);
    const user = await getUserByToken(t);
    await updateUser(user.id, { status: 'online' });
    return res.json({ token: t, user: safeUser(user) }), true;
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const user = await getUserByToken(tk);
    if (!user) return res.json({ error: 'Non authentifié' }, 401), true;
    return res.json({ user: safeUser(user) }), true;
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && method === 'POST') {
    const user = await getUserByToken(tk);
    if (user) await updateUser(user.id, { status: 'offline' });
    await deleteSession(tk);
    return res.json({ success: true }), true;
  }

  // GET /api/users
  if (path === '/api/users' && method === 'GET') {
    const me = await getUserByToken(tk);
    if (!me) return res.json({ error: 'Non authentifié' }, 401), true;
    const all = await getUsers();
    let result = all.filter(u => u.role === 'valet');
    if (me.role === 'manager') result = result.filter(u => u.manager_id === me.id);
    return res.json({ users: result.map(safeUser) }), true;
  }

  // POST /api/users — créer voiturier
  if (path === '/api/users' && method === 'POST') {
    const me = await getUserByToken(tk);
    if (!me || !['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const { name, phone } = body;
    if (!name || !phone) return res.json({ error: 'name et phone requis' }, 400), true;
    const existing = await getUserByPhone(phone);
    if (existing) return res.json({ error: 'Téléphone déjà utilisé' }, 400), true;
    const all = await getUsers();
    const valetCount = all.filter(u => u.role === 'valet').length;
    const year = new Date().getFullYear();
    const idx = String(valetCount + 1).padStart(3,'0');
    const valet = {
      id: `v${Date.now()}`, role: 'valet', name, phone,
      email: body.email || '', adresse: body.adresse || '', notes: body.notes || '',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      matricule: `V-${year}-${idx}`,
      manager_id: me.role === 'manager' ? me.id : (body.managerId || me.id),
      status: 'offline',
    };
    const created = await createUser(valet);
    return res.json({ user: safeUser(created) }, 201), true;
  }

  // GET /api/managers
  if (path === '/api/managers' && method === 'GET') {
    const me = await getUserByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const all = await getUsers();
    return res.json({ managers: all.filter(u => u.role === 'manager').map(safeUser) }), true;
  }

  // POST /api/managers
  if (path === '/api/managers' && method === 'POST') {
    const me = await getUserByToken(tk);
    if (!me || me.role !== 'admin') return res.json({ error: 'Non autorisé' }, 403), true;
    const { name, email, password, phone } = body;
    if (!name || !email || !password) return res.json({ error: 'name, email et password requis' }, 400), true;
    const existing = await getUserByEmail(email);
    if (existing) return res.json({ error: 'Email déjà utilisé' }, 400), true;
    const manager = {
      id: `mgr${Date.now()}`, role: 'manager', name, email, password,
      phone: phone || '',
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2),
      status: 'offline',
    };
    const created = await createUser(manager);
    return res.json({ manager: safeUser(created) }, 201), true;
  }

  // PATCH /api/users/:id
  if (path.match(/^\/api\/users\/[^/]+$/) && method === 'PATCH') {
    const uid = path.split('/')[3];
    const me = await getUserByToken(tk);
    if (!me || !['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    const updates = {};
    if (body.blocked   !== undefined) updates.blocked    = body.blocked;
    if (body.name      !== undefined) updates.name       = body.name;
    if (body.phone     !== undefined) updates.phone      = body.phone;
    if (body.email     !== undefined) updates.email      = body.email;
    if (body.adresse   !== undefined) updates.adresse    = body.adresse;
    if (body.notes     !== undefined) updates.notes      = body.notes;
    if (body.managerId !== undefined) updates.manager_id = body.managerId;
    if (body.status    !== undefined) updates.status     = body.status;
    const updated = await updateUser(uid, updates);
    return res.json({ user: safeUser(updated) }), true;
  }

  // DELETE /api/users/:id
  if (path.match(/^\/api\/users\/[^/]+$/) && method === 'DELETE') {
    const uid = path.split('/')[3];
    const me = await getUserByToken(tk);
    if (!me || !['admin','manager'].includes(me.role)) return res.json({ error: 'Non autorisé' }, 403), true;
    await deleteUser(uid);
    return res.json({ success: true }), true;
  }

  return false;
}
