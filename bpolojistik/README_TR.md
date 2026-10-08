# BPO Lojistik — Vercel + Supabase canlı sürüm

Bu sürümde tarayıcı `localStorage` veritabanı olmaktan çıkar. Vercel arayüzü yayınlar; Vercel Functions ortak veriyi Supabase PostgreSQL'e yazar; Supabase Realtime değişiklik sinyalini diğer açık ekranlara gönderir.

## 1. Supabase oluştur
1. https://supabase.com üzerinden hesap aç.
2. New project oluştur.
3. SQL Editor > New query aç.
4. Bu klasördeki `supabase.sql` dosyasının tamamını yapıştır ve Run ile çalıştır.
5. Project Settings > API bölümünden Project URL ve Publishable/anon key değerlerini al.

## 2. Vercel değişkenleri
Vercel Project > Settings > Environment Variables bölümüne şunları ekle:
- `SUPABASE_URL` = Supabase Project URL
- `SUPABASE_ANON_KEY` = Supabase Publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` = Supabase Secret/service_role key
- `PASSWORD_SALT` = `BPO_LOJISTIK_2026_SALT_v1` (ilk kurulumdaki varsayılan hesapların çalışması için bunu kullan)
- `APP_SESSION_SECRET` = başka uzun rastgele bir metin

**SUPABASE_SERVICE_ROLE_KEY'i asla index.html içine koyma.** Bu anahtar sadece Vercel Functions tarafında kalmalıdır.

## 3. GitHub
Bu klasördeki dosyaları GitHub repository köküne koy:
- `index.html`
- `package.json`
- `vercel.json`
- `.gitignore`
- `api/` klasörü
- `supabase.sql`

## 4. Vercel
1. vercel.com > Add New > Project.
2. GitHub repository'ni seç.
3. Framework Preset: Other.
4. Build Command boş bırak.
5. Output Directory boş bırak.
6. Deploy.
7. Environment Variables değerlerini ekledikten sonra Redeploy yap.

## 5. İlk giriş
SQL dosyasındaki varsayılan hesaplar:
- admin / admin
- sevkiyat / sevkiyat
- yakitsistemleri / yakit123

İlk girişten sonra Admin Paneli > Kullanıcı Yetkilendirme > Düzenle üzerinden admin parolasını değiştir. `PASSWORD_SALT` değerini sonradan değiştirme; değiştirirsen mevcut hash'ler için parola migration gerekir.

## 6. Eski localStorage verileri
Eski GitHub/Vercel sürümündeki kayıtlar otomatik olarak Supabase'e taşınmaz; çünkü onlar kullanıcının kendi tarayıcısındaki localStorage'dadır. Eski uygulamada `Yedek Al` ile JSON yedeği alıp ayrıca migration yapılması gerekir.

## 7. Gerçek zamanlı çalışma
Bir kullanıcı sefer kaydettiğinde `/api/state` Supabase'e yazar ve `bpo-live` broadcast'i gönderir. Diğer açık ekranlar bu sinyali alıp `/api/state` üzerinden yeni veriyi çeker ve tabloyu yeniler.

Kullanıcı çevrim içi durumu 4 saniyelik heartbeat ile `bpo_presence` tablosuna yazılır; 30 saniyeden eski oturumlar çevrim dışı kabul edilir.
