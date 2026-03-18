import crypto from 'crypto';

// ─── USERS ─────────────────────────────────────────────────
export const users = [
  // Admins
  { id: 'admin1', role: 'admin', name: 'Admin Principal', email: 'admin@valetapp.ma', password: 'admin123', avatar: 'AP', phone: '+212600000000' },
  // Managers
  { id: 'mgr1', role: 'manager', name: 'Ahmed Mansouri', email: 'ahmed@valetapp.ma', password: 'mgr123', avatar: 'AM', phone: '+212600000001', managerId: 'mgr1' },
  { id: 'mgr2', role: 'manager', name: 'Laila Idrissi',  email: 'laila@valetapp.ma',  password: 'mgr123', avatar: 'LI', phone: '+212600000002', managerId: 'mgr2' },
  // Valets
  { id: "v1", role: "valet", name: "Mohammed Alami",  phone: "+212611223344", avatar: "MA", matricule: "V-2026-001", managerId: "mgr1", status: "online" },
  { id: "v2", role: "valet", name: "Fatima Zahra",    phone: "+212622334455", avatar: "FZ", matricule: "V-2026-002", managerId: "mgr1", status: "online" },
  { id: "v3", role: "valet", name: "Youssef Bennani", phone: "+212633445566", avatar: "YB", matricule: "V-2026-003", managerId: "mgr2", status: "offline" },
  { id: "v4", role: "valet", name: "Sara El Fassi",   phone: "+212644556677", avatar: "SE", matricule: "V-2026-004", managerId: "mgr2", status: "online" },
];

// ─── QR CARDS ──────────────────────────────────────────────
export const qrCards = Array.from({ length: 20 }, (_, i) => ({
  id: `QR-${String(i+1).padStart(3,'0')}`,
  status: 'available',
  lastUsed: null,
  createdAt: new Date().toISOString(),
}));

// ─── MISSIONS ──────────────────────────────────────────────
export const missions = [];

// ─── OTP & SESSIONS ────────────────────────────────────────
export const otpStore  = new Map();
export const sessions  = new Map(); // token → userId

// ─── HELPERS ───────────────────────────────────────────────
export function uid()   { return crypto.randomUUID().replace(/-/g,'').slice(0,12); }
export function token() { return crypto.randomBytes(32).toString('hex'); }
export function otp()   { return String(Math.floor(100000 + Math.random()*900000)); }

export function userByToken(t) {
  const id = sessions.get(t);
  return id ? users.find(u => u.id === id) || null : null;
}
export function missionByQR(qrId) {
  return missions.find(m => m.qrId === qrId && m.status !== 'done') || null;
}
