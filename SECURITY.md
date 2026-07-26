# Security

- Semua tabel public memakai RLS; mutasi sensitif menggunakan server route atau RPC terbatas.
- Service role, LiveKit secret, pepper, dan cron secret tidak memakai prefix `NEXT_PUBLIC_`.
- Invitation adalah random 256-bit, sekali pakai, kedaluwarsa, dan hanya hash ber-pepper yang disimpan.
- Bucket `photobox-raw` dan `photobox-results` private. Signed URL berumur pendek.
- MIME dibatasi ke JPEG/WebP, ukuran maksimum 6 MiB untuk raw, dimensi positif, path dibentuk server, dan Sharp mendecode input.
- Room dibatasi satu host + satu guest oleh partial unique index dan transaction lock.
- Header CSP, nosniff, referrer, dan camera/microphone permissions dikirim oleh Next.js.
- API mengembalikan error terstruktur tanpa stack trace atau secret. Token, signed URL, gambar/base64 tidak dicatat.

Untuk pelaporan kerentanan, jangan membuka issue publik yang berisi token atau data pengguna. Rotasi secret yang mungkin terekspos dan hapus sesi terkait.
