import crypto from 'node:crypto';
import { supabaseAdmin, json } from './_supabase.js';

function hashPassword(pass) {
  return crypto.createHash('sha256').update(String(pass) + process.env.PASSWORD_SALT).digest('hex');
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', process.env.APP_SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    const { username, password } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const u = String(username || '').trim().toLocaleLowerCase('tr-TR');
    const p = String(password || '');
    if (!u || !p) return json(res, 400, { error: 'Kullanıcı adı ve parola gerekli.' });

    const sb = supabaseAdmin();
    const { data, error } = await sb.from('bpo_users').select('*').eq('username', u).maybeSingle();
    if (error) throw error;
    if (!data || data.status !== 'approved' || data.password_hash !== hashPassword(p)) {
      return json(res, 401, { error: 'Kullanıcı adı veya parola geçersiz.' });
    }

    const session = sign({ username: data.username, iat: Date.now(), exp: Date.now() + 1000 * 60 * 60 * 12 });
    await sb.from('bpo_presence').upsert({ session_id: crypto.randomUUID(), username: data.username, name: data.name, facility: data.facility, last_seen: new Date().toISOString() }, { onConflict: 'session_id' });
    const { password_hash, ...safeUser } = data;
    return json(res, 200, { user: safeUser, token: session });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: 'Sunucu hatası.' });
  }
}
