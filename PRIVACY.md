# Privasi PhotoBox GT

Kamera dan mikrofon hanya digunakan setelah pengguna memberi izin. Live video/audio dikirim melalui LiveKit untuk komunikasi realtime dan tidak direkam oleh aplikasi.

Foto mentah digunakan hanya untuk membentuk strip photobox, disimpan sementara di bucket privat, kemudian dihapus setelah hasil berhasil dibuat atau maksimal 24 jam. Hasil kedaluwarsa default setelah 24 jam. Peserta dapat menghapusnya lebih cepat melalui halaman hasil.

Database menyimpan metadata minimum seperti user ID anonim, nama tampilan, membership, status sesi, dan storage path. Aplikasi tidak menyimpan base64 foto, detail perangkat kamera/mikrofon yang tidak diperlukan, access token, atau invitation token mentah.
