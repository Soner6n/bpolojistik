import crypto from 'node:crypto';
import { supabaseAdmin, json } from './_supabase.js';
import { verifySession } from './_auth.js';

export default async function handler(req, res) {
  const session = verifySession(req, res); if (!session) return;
  const sb = supabaseAdmin();
  try {
    if (req.method === 'GET') {
      const [trips, users, plates, chats, audits, presence] = await Promise.all([
        sb.from('bpo_trips').select('data'), sb.from('bpo_users').select('username,name,phone,email,role,facility,status,last_seen'),
        sb.from('bpo_plates').select('plate').order('plate'), sb.from('bpo_chat').select('data').order('created_at'),
        sb.from('bpo_audit').select('data').order('created_at', { ascending: false }).limit(500), sb.from('bpo_presence').select('username,name,facility,last_seen')
      ]);
      for (const x of [trips, users, plates, chats, audits, presence]) if (x.error) throw x.error;
      return json(res, 200, {
        dataset: trips.data.map(x => x.data), usersList: users.data, allowedPlakalar: plates.data.map(x => x.plate),
        chatMessages: chats.data.map(x => x.data), auditLog: audits.data.map(x => x.data), presence: presence.data
      });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const action = body.action;
    if (action === 'upsertTrip') {
      const d = body.data; const { error } = await sb.from('bpo_trips').upsert({ id: d.id, data: d, updated_at: new Date().toISOString() }); if (error) throw error;
    } else if (action === 'deleteTrip') {
      const { error } = await sb.from('bpo_trips').delete().eq('id', body.id); if (error) throw error;
    } else if (action === 'saveUsers') {
      const users = body.users || [];
      const incoming = new Set(users.map(u => u.username));
      const existing = await sb.from('bpo_users').select('username'); if (existing.error) throw existing.error;
      const stale = existing.data.filter(x => !incoming.has(x.username)).map(x => x.username);
      if (stale.length) { const { error } = await sb.from('bpo_users').delete().in('username', stale); if (error) throw error; }
      for (const u of users) {
        const current = await sb.from('bpo_users').select('password_hash').eq('username', u.username).maybeSingle();
        if (current.error) throw current.error;
        const rawPass = u.pass || '';
        const password_hash = rawPass ? (/^[0-9a-f]{64}$/i.test(rawPass) ? rawPass : crypto.createHash('sha256').update(String(rawPass) + process.env.PASSWORD_SALT).digest('hex')) : (u.password_hash || current.data?.password_hash || '');
        const { error } = await sb.from('bpo_users').upsert({ username:u.username, name:u.name, phone:u.phone||'', email:u.email||'', role:u.role||'', facility:u.facility||'', status:u.status||'approved', password_hash, last_seen:u.lastSeen ? new Date(u.lastSeen).toISOString() : null });
        if (error) throw error;
      }
    } else if (action === 'savePlates') {
      const { data: old, error: oe } = await sb.from('bpo_plates').select('plate'); if (oe) throw oe;
      const keep = new Set(body.plates || []);
      const remove = old.filter(x => !keep.has(x.plate)).map(x => x.plate);
      if (remove.length) { const { error } = await sb.from('bpo_plates').delete().in('plate', remove); if (error) throw error; }
      if (keep.size) { const { error } = await sb.from('bpo_plates').upsert([...keep].map(plate=>({plate}))); if (error) throw error; }
    } else if (action === 'saveChat') {
      const messages = body.messages || [];
      for (const m of messages.slice(-1000)) { const { error } = await sb.from('bpo_chat').upsert({ id:m.id, data:m, created_at:new Date(m.timestamp || Date.now()).toISOString() }); if (error) throw error; }
    } else if (action === 'saveAudit') {
      const a = body.audit || []; for (const x of a.slice(0,500)) { const { error } = await sb.from('bpo_audit').upsert({ id:x.id, data:x, created_at:new Date().toISOString() }); if (error) throw error; }
    } else if (action === 'presence') {
      const { username, name, facility, sessionId } = body; const { error } = await sb.from('bpo_presence').upsert({ session_id:sessionId, username, name, facility, last_seen:new Date().toISOString() }); if (error) throw error;
      await sb.from('bpo_presence').delete().lt('last_seen', new Date(Date.now()-30000).toISOString());
    } else if (action === 'register') {
      const u = body.user; const { error } = await sb.from('bpo_users').insert({ username:u.username, name:u.name, phone:u.phone||'', email:u.email||'', facility:u.facility||'', role:u.role||'', status:'pending', password_hash:u.pass }); if (error) throw error;
    } else if (action === 'reset') {
      if (session.username !== 'admin') return json(res, 403, { error:'Admin gerekli.' });
      await Promise.all([sb.from('bpo_trips').delete().neq('id','__never__'), sb.from('bpo_chat').delete().neq('id','__never__'), sb.from('bpo_audit').delete().neq('id','__never__')]);
    } else return json(res, 400, { error:'Bilinmeyen işlem.' });

    const live = sb.channel('bpo-live'); await live.subscribe(); await live.send({ type:'broadcast', event:'changed', payload:{ action, at:Date.now(), by:session.username } }); await sb.removeChannel(live);
    return json(res, 200, { ok:true });
  } catch (e) { console.error(e); return json(res, 500, { error:e.message || 'Sunucu hatası.' }); }
}
