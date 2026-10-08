import crypto from 'node:crypto';
import { getBearer, json } from './_supabase.js';

export function verifySession(req, res) {
  const token = getBearer(req);
  if (!token || !process.env.APP_SESSION_SECRET) { json(res, 401, { error: 'Oturum gerekli.' }); return null; }
  const [body, sig] = token.split('.');
  if (!body || !sig) { json(res, 401, { error: 'Geçersiz oturum.' }); return null; }
  const expected = crypto.createHmac('sha256', process.env.APP_SESSION_SECRET).update(body).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) { json(res, 401, { error: 'Geçersiz oturum.' }); return null; }
  const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!p.exp || p.exp < Date.now()) { json(res, 401, { error: 'Oturum süresi doldu.' }); return null; }
  return p;
}
