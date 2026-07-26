# Deployment PhotoBox GT

Deployment memerlukan kredensial Supabase, LiveKit, GitHub, dan Vercel milik Anda. Tidak ada deployment cloud yang diklaim oleh repository ini.

## Urutan deployment

1. Terapkan migration `0001`–`0005` dan `seed.sql` ke Supabase.
2. Aktifkan Anonymous Sign-Ins dan periksa lima tema aktif.
3. Buat project LiveKit Cloud dan simpan URL serta API credentials.
4. Push repository ke GitHub.
5. Import repository GitHub ke Vercel.
6. Isi environment variable untuk Preview dan Production.
7. Deploy pertama, perbarui `NEXT_PUBLIC_APP_URL`, lalu redeploy.
8. Tambahkan URL production ke Supabase Authentication URL Configuration.
9. Uji invitation pada incognito atau perangkat kedua.

## 1. Supabase Cloud

1. Buat project di region terdekat dari mayoritas pengguna dan simpan password database.
2. Di Authentication → Providers, aktifkan **Anonymous Sign-Ins**. Atur Site URL dan allowed redirect URL untuk localhost, Vercel Preview, lalu domain production.
3. Ambil Project URL, publishable key, dan service role key. Service role hanya boleh masuk environment server.
4. Link CLI dan dorong migration dari database kosong:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
npx supabase db reset
```

`db reset` hanya untuk local development. Migration membuat schema, constraint, RPC atomik, RLS, bucket private, dan Realtime publication; seed membuat lima tema.

5. Deploy cleanup function dan secret:

```bash
npx supabase functions deploy cleanup-expired-photobox
npx supabase secrets set CLEANUP_CRON_SECRET=<RANDOM_SECRET>
```

Di SQL Editor, aktifkan extension `pg_cron`, `pg_net`, dan Vault. Simpan URL function serta bearer secret di Vault, lalu buat job per jam. Contoh berikut harus disesuaikan dengan nama secret Vault project:

```sql
select cron.schedule(
  'cleanup-photobox-hourly',
  '0 * * * *',
  $$select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='cleanup_function_url'),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='cleanup_cron_secret')
    ),
    body := '{}'::jsonb
  );$$
);
```

Pastikan bucket `photobox-raw` dan `photobox-results` tetap **private** dan tabel yang ditentukan muncul pada Realtime publication.

## 2. LiveKit Cloud

1. Buat project LiveKit Cloud.
2. Salin WebSocket URL, API key, dan API secret.
3. Isi URL ke `NEXT_PUBLIC_LIVEKIT_URL`; key/secret hanya ke environment server.
4. Uji dua perangkat melalui Wi‑Fi dan mobile data, mute/camera selection, permission denied, tab refresh, dan reconnect. HTTPS wajib di luar localhost.

## 3. GitHub dan Vercel

Push repository ke GitHub lalu import di Vercel dengan preset Next.js. Tambahkan seluruh `.env.example` untuk Preview dan Production:

- `NEXT_PUBLIC_APP_URL`
- `APP_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `INVITATION_TOKEN_PEPPER` (random minimal 32 karakter)
- `CLEANUP_CRON_SECRET`
- `NEXT_PUBLIC_ENABLE_DEMO_REMOTE=false`

Opsional via CLI:

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_LIVEKIT_URL
vercel env add LIVEKIT_API_KEY
vercel env add LIVEKIT_API_SECRET
vercel env add INVITATION_TOKEN_PEPPER
vercel env add CLEANUP_CRON_SECRET
vercel
vercel --prod
```

Setelah URL production tersedia, perbarui `NEXT_PUBLIC_APP_URL`, Supabase Site URL/redirect URL, lalu redeploy.

Gunakan konfigurasi Supabase berikut:

```text
Authentication → URL Configuration
Site URL: https://nama-project.vercel.app
Redirect URLs:
https://nama-project.vercel.app/**
```

Route create-room memakai origin request sebagai fallback ketika deployment masih memiliki `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Meski demikian, production tetap harus menggunakan URL final Vercel agar link konsisten.

Project menggunakan region Vercel Singapore (`sin1`) melalui `vercel.json`. Route pemrosesan Sharp memakai Node.js runtime dengan target durasi maksimum 60 detik; batas aktual mengikuti paket Vercel.

### Uji invitation production

1. Buka domain production sebagai host.
2. Buat room dan salin invitation URL.
3. Pastikan URL menggunakan `https://` dan bukan localhost.
4. Buka URL melalui incognito atau perangkat kedua.
5. Izinkan kamera dan mikrofon pada kedua perangkat.
6. Pastikan ready state tersinkron, host dapat start, dan user ketiga ditolak.

## Production checklist

- `npm run lint`, `typecheck`, `test`, dan `build` lulus.
- Migration diterapkan sebelum traffic masuk; anonymous auth aktif.
- Tidak ada secret ber-prefix `NEXT_PUBLIC_`; cek client bundle dan Vercel logs.
- Dua perangkat berhasil join, ready, capture, generate, download, delete.
- User ketiga, guest start, room lain, expired invite/result, file >6 MiB, MIME salah ditolak.
- Cleanup dijalankan manual sekali dan Cron history menunjukkan sukses.
- Camera/microphone permission denied dan LiveKit outage menampilkan fallback.
