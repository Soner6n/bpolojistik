-- BPO Lojistik: Supabase veritabanı
create extension if not exists pgcrypto;

create table if not exists public.bpo_users (
  username text primary key,
  name text not null default '', phone text default '', email text default '',
  role text not null default '', facility text default '', status text not null default 'pending',
  password_hash text not null, last_seen timestamptz
);
create table if not exists public.bpo_trips (id text primary key, data jsonb not null, updated_at timestamptz not null default now());
create table if not exists public.bpo_plates (plate text primary key);
create table if not exists public.bpo_chat (id text primary key, data jsonb not null, created_at timestamptz not null default now());
create table if not exists public.bpo_audit (id text primary key, data jsonb not null, created_at timestamptz not null default now());
create table if not exists public.bpo_presence (session_id text primary key, username text not null, name text not null default '', facility text default '', last_seen timestamptz not null default now());

-- Tüm uygulama yazma/okuma işlemleri Vercel API + service_role üzerinden yapılır.
-- Bu tabloları public Data API üzerinden açmayın; RLS açık ve client grant'leri kapalı kalsın.
alter table public.bpo_users enable row level security;
alter table public.bpo_trips enable row level security;
alter table public.bpo_plates enable row level security;
alter table public.bpo_chat enable row level security;
alter table public.bpo_audit enable row level security;
alter table public.bpo_presence enable row level security;

revoke all on public.bpo_users from anon, authenticated;
revoke all on public.bpo_trips from anon, authenticated;
revoke all on public.bpo_plates from anon, authenticated;
revoke all on public.bpo_chat from anon, authenticated;
revoke all on public.bpo_audit from anon, authenticated;
revoke all on public.bpo_presence from anon, authenticated;

-- Bu sürüm Supabase Realtime Broadcast kullanır; tablo publication ayarı gerekmez.

-- İlk kurulum kullanıcıları (hemen ardından admin parolasını değiştirin).
insert into public.bpo_users (username,name,phone,email,role,facility,status,password_hash) values
('admin','Sistem Yöneticisi','0500 000 00 00','admin@bpo.com','admin','Tüm Tesisler','approved','8aab847d43f0fb873edfc1a13babaa5c0742008ef83b265e4b56008fc78234ae'),
('sevkiyat','Sevkiyat Sorumlusu','0500 000 00 01','sevkiyat@bpo.com','Sevkiyat Sorumlusu','Panayır','approved','342e3c1dbfcd59806df5237216e55b8db629f3cd147e3b498969535e77f07f7e'),
('yakitsistemleri','Yakıt Sistemleri Operatörü','0500 000 00 02','yakit@bpo.com','Yakıt Sistemleri','Yakıt Sistemleri','approved','cc14da788b8a03a8e73b5b85d270f699a785779fc321befff5496160d75059bc')
on conflict (username) do nothing;

insert into public.bpo_plates (plate) values
('16AJU132'),('16YC393'),('16BPO01'),('16BPO02'),('16BPO03'),('16RH890'),('16M9012'),('16K7743'),('16AAB123'),('16XYZ99')
on conflict (plate) do nothing;
