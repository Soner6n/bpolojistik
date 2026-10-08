import { supabaseAdmin, json } from './_supabase.js';
import { verifySession } from './_auth.js';
export default async function handler(req,res){
 const s=verifySession(req,res); if(!s)return;
 try{const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}; const sb=supabaseAdmin(); const {error}=await sb.from('bpo_presence').upsert({session_id:body.sessionId,username:s.username,name:body.name||s.username,facility:body.facility||'',last_seen:new Date().toISOString()}); if(error)throw error; await sb.from('bpo_presence').delete().lt('last_seen',new Date(Date.now()-30000).toISOString()); return json(res,200,{ok:true});}catch(e){return json(res,500,{error:e.message});}}
