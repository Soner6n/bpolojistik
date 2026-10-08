export default async function handler(req,res){
  if(req.method!=='GET'){res.statusCode=405;return res.end();}
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({supabaseUrl:process.env.SUPABASE_URL,supabaseAnonKey:process.env.SUPABASE_ANON_KEY});
}
