# Panduan Pengujian untuk Video Demo

## Persiapan

1. Pastikan `.env` sudah diisi dengan nilai yang sesuai
2. Jalankan seeder untuk mengisi database:
   ```bash
   node scripts/seed.js
   ```

3. Jalankan ketiga aplikasi di terminal terpisah:

   **Terminal 1 - API Gateway:**
   ```bash
   node app.js
   ```

   **Terminal 2 - Service Nilai:**
   ```bash
   cd service-nilai
   node app.js
   ```

   **Terminal 3 - Service Transkrip:**
   ```bash
   cd service-transkrip
   node app.js
   ```

## Skrip Pengujian

### 1. Health Check

```bash
# Gateway
curl http://localhost:3000/

# Service Nilai
curl http://localhost:3001/

# Service Transkrip
curl http://localhost:3002/
```

### 2. Login (Berhasil)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"username":"admin1","password":"admin123"}'
```

Simpan `accessToken` dan `refreshToken` dari respons.

### 3. Login (Gagal - Device ID Salah)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: device-salah" \
  -d '{"username":"admin1","password":"admin123"}'
```

Harus mendapat respons `DENY` dengan kode `DEVICE_MISMATCH`.

### 4. Login (Gagal - Password Salah)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"username":"admin1","password":"password-salah"}'
```

Harus mendapat respons `DENY` dengan kode `INVALID_CREDENTIALS`.

### 5. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"refreshToken":"<paste-refresh-token>"}'
```

### 6. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"refreshToken":"<paste-refresh-token>"}'
```

### 7. Get Service Token

```bash
curl -X POST http://localhost:3000/auth/service \
  -H "Content-Type: application/json" \
  -d '{"client_id":"nilai-service-id","client_secret":"nilai-service-secret-key-please-change"}'
```

### 8. Akses Langsung ke Service (Tanpa Gateway - Harus Gagal)

```bash
curl http://localhost:3001/nilai
```

Harus mendapat respons `DENY` dengan kode `INVALID_GATEWAY_SECRET`.

### 9. Akses Nilai via Gateway (Admin)

```bash
curl http://localhost:3000/nilai \
  -H "X-Device-ID: dev-admin-1" \
  -H "Authorization: Bearer <paste-access-token>"
```

### 10. Login sebagai Mahasiswa

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-mhs-farhan-123" \
  -d '{"username":"mhs_farhan-esha-putra_001","password":"mahasiswa123"}'
```

Simpan `accessToken` mahasiswa.

### 11. Mahasiswa Lihat Nilai (Hanya Miliknya)

```bash
curl http://localhost:3000/nilai \
  -H "X-Device-ID: dev-mhs-farhan-123" \
  -H "Authorization: Bearer <paste-mahasiswa-token>"
```

### 12. Login sebagai Dosen

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -d '{"username":"dsn_alam-rahmatulloh123","password":"dosen123"}'
```

Simpan `accessToken` dosen.

### 13. Dosen Lihat Nilai (Kelas yang Diampu)

```bash
curl http://localhost:3000/nilai \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer <paste-dosen-token>"
```

### 14. Dosen Update Nilai (Hanya pada Jam Kerja 07:00-21:00)

```bash
curl -X PUT http://localhost:3000/nilai/1 \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer <paste-dosen-token>" \
  -d '{"nilaiAngka":85}'
```

### 15. Dosen Finalisasi Kelas

```bash
curl -X POST http://localhost:3000/kelas/1/finalisasi \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer <paste-dosen-token>"
```

### 16. Coba Update Nilai yang Sudah Final (Harus Gagal)

```bash
curl -X PUT http://localhost:3000/nilai/1 \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer <paste-dosen-token>" \
  -d '{"nilaiAngka":90}'
```

Harus mendapat respons `DENY` dengan kode `UPDATE_FAILED`.

### 17. Lihat Transkrip Mahasiswa

```bash
curl http://localhost:3000/transkrip/247006001 \
  -H "X-Device-ID: dev-mhs-farhan-123" \
  -H "Authorization: Bearer <paste-mahasiswa-token>"
```

### 18. Cek Audit Log

```bash
sqlite3 database.sqlite "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 10;"
```

### 19. Cek Data Transkrip (Setelah Finalisasi)

```bash
sqlite3 database.sqlite "SELECT * FROM transkrip;"
```

## Struktur Kode yang Perlu Ditunjukkan di Video

### Autentikasi & Token
- `routes/auth.js` lines 16-110: POST /auth/login
- `services/jwtService.js`: generateAccessToken dan generateRefreshToken
- `routes/auth.js` lines 111-138: POST /auth/service
- `routes/auth.js` lines 140-184: POST /auth/logout

### Gateway Secret & Proxy
- `app.js` lines 39-60: Konfigurasi proxy dengan X-Gateway-Secret
- `service-nilai/middlewares/auth.js`: verifyGatewaySecret
- `service-transkrip/middlewares/auth.js`: verifyGatewaySecret

### RBAC & Kebijakan Akses
- `service-nilai/routes/nilai.js` lines 12-40: GET /nilai (filter berdasarkan role)
- `service-nilai/routes/nilai.js` lines 42-95: PUT /nilai/:id (cek role & jam kerja)
- `service-nilai/routes/nilai.js` lines 97-167: POST /kelas/:id/finalisasi
- `service-transkrip/routes/transkrip.js` lines 8-34: GET /transkrip/:nim

### Sinkronisasi Transkrip
- `service-nilai/routes/nilai.js` lines 149-167: Request service token & sinkronisasi
- `service-transkrip/routes/transkrip.js` lines 36-59: POST /transkrip/sinkron

### Audit Log
- `services/auditLogger.js`: Fungsi logActivity
- Cek di mana logActivity dipanggil di setiap endpoint

## Catatan Keamanan

- File `.env` sudah diexclude dari git (lihat `.gitignore`)
- Tidak ada password atau secret yang hard-coded di source code
- Semua konfigurasi sensitif diambil dari environment variables
- Gateway secret dan JWT secret di-set wajib (fail-fast jika tidak ada)
