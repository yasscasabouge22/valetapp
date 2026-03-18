import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── HELPERS ───────────────────────────────────────────────
export function uid()   { return crypto.randomUUID().replace(/-/g,'').slice(0,12); }
export function token() { return crypto.randomBytes(32).toString('hex'); }
export function otp()   { return String(Math.floor(100000 + Math.random()*900000)); }

// ─── USERS ─────────────────────────────────────────────────
export async function getUsers()          { const { data } = await supabase.from('users').select('*'); return data || []; }
export async function getUserById(id)     { const { data } = await supabase.from('users').select('*').eq('id', id).single(); return data; }
export async function getUserByPhone(p)   { const { data } = await supabase.from('users').select('*').eq('phone', p).single(); return data; }
export async function getUserByEmail(e)   { const { data } = await supabase.from('users').select('*').eq('email', e).single(); return data; }
export async function createUser(u)       { const { data } = await supabase.from('users').insert(u).select().single(); return data; }
export async function updateUser(id, u)   { const { data } = await supabase.from('users').update(u).eq('id', id).select().single(); return data; }
export async function deleteUser(id)      { await supabase.from('users').delete().eq('id', id); }

// ─── SESSIONS ──────────────────────────────────────────────
export async function createSession(tok, userId) { await supabase.from('sessions').insert({ token: tok, user_id: userId }); }
export async function deleteSession(tok)          { await supabase.from('sessions').delete().eq('token', tok); }
export async function getUserByToken(tok) {
  const { data: session } = await supabase.from('sessions').select('user_id').eq('token', tok).single();
  if (!session) return null;
  return getUserById(session.user_id);
}

// ─── OTP ───────────────────────────────────────────────────
export async function saveOTP(phone, code, userId) {
  const expires_at = new Date(Date.now() + 5*60*1000).toISOString();
  await supabase.from('otps').upsert({ phone, code, user_id: userId, expires_at });
}
export async function getOTP(phone) {
  const { data } = await supabase.from('otps').select('*').eq('phone', phone).single();
  return data;
}
export async function deleteOTP(phone) { await supabase.from('otps').delete().eq('phone', phone); }

// ─── QR CARDS ──────────────────────────────────────────────
export async function getQRCards()       { const { data } = await supabase.from('qr_cards').select('*').order('id'); return data || []; }
export async function getQRCard(id)      { const { data } = await supabase.from('qr_cards').select('*').eq('id', id).single(); return data; }
export async function updateQRCard(id,u) { const { data } = await supabase.from('qr_cards').update(u).eq('id', id).select().single(); return data; }
export async function createQRCards(ids) {
  const cards = ids.map(id => ({ id, status: 'available' }));
  const { data } = await supabase.from('qr_cards').insert(cards).select();
  return data;
}

// ─── MISSIONS ──────────────────────────────────────────────
export async function getMissions()        { const { data } = await supabase.from('missions').select('*').order('created_at', { ascending: false }); return data || []; }
export async function getMissionById(id)   { const { data } = await supabase.from('missions').select('*').eq('id', id).single(); return data; }
export async function getMissionByQR(qrId) {
  const { data } = await supabase.from('missions').select('*').eq('qr_id', qrId).neq('status', 'done').single();
  return data;
}
export async function createMission(m)     { const { data } = await supabase.from('missions').insert(m).select().single(); return data; }
export async function updateMission(id, u) { const { data } = await supabase.from('missions').update({ ...u, updated_at: new Date().toISOString() }).eq('id', id).select().single(); return data; }
