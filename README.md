# Gateway Zero Trust

API gateway berbasis Node.js/Express untuk simulasi arsitektur **Zero Trust**
pada sistem akademik sesuai NIST SP 800-207. Sistem ini terdiri dari tiga
komponen terpisah:

1. **API Gateway (port 3000)** - Policy Enforcement Point (PEP) yang menjadi
   satu-satunya pintu masuk. Memeriksa setiap request, menerbitkan token,
   mencatat audit log, dan meneruskan request ke service yang sesuai.
2. **Service Nilai (port 3001)** - Resource yang menyimpan data nilai dan kelas.
   Hanya menerima request yang melalui gateway dengan gateway secret yang valid.
3. **Service Transkrip (port 3002)** - Resource yang menyimpan data transkrip
   mahasiswa. Hanya menerima request yang melalui gateway dengan gateway secret
   yang valid.

Setiap request dari user wajib membawa:
1. `X-Device-ID` yang terdaftar dan cocok dengan pengguna di database.
2. Access token JWT yang valid dan diterbitkan untuk device yang sama.

Panggilan antar-service menggunakan token service yang diterbitkan oleh gateway.

## Fitur

- **API Gateway**:
  - Login dengan username, password bcrypt, dan device ID.
  - Access token JWT dengan masa berlaku 10 menit.
  - Refresh token JWT dengan masa berlaku 1 hari, disimpan di database.
  - Endpoint untuk mendapatkan token service (5 menit, role: service).
  - Endpoint untuk logout (mencabut refresh token).
  - Verifikasi device pada semua endpoint terproteksi.
  - Audit log untuk semua keputusan ALLOW/DENY.
  - Proxy request ke service menggunakan http-proxy-middleware.
  - Menambahkan header X-Gateway-Secret saat meneruskan request ke service.

- **Service Nilai**:
  - GET /nilai - melihat nilai sesuai role (mahasiswa: milik sendiri, dosen: kelas yang diampu, admin: semua).
  - PUT /nilai/:id - memperbarui nilai (dosen/admin pada jam kerja, nilai belum final).
  - POST /kelas/:id/finalisasi - memfinalisasi kelas dan sinkronisasi ke transkrip.
  - Verifikasi gateway secret dan JWT token.

- **Service Transkrip**:
  - GET /transkrip/:nim - melihat transkrip sesuai role (mahasiswa: NIM sendiri, admin: semua).
  - POST /transkrip/sinkron - sinkronisasi nilai ke transkrip (hanya token service).
  - Verifikasi gateway secret dan JWT token.

- **Database**:
  - SQLite melalui `better-sqlite3`.
  - Seeder untuk membuat schema dan data demo.
  - Shared database untuk kedua service.

## Teknologi

- Node.js 18+
- Express 5
- http-proxy-middleware
- SQLite (`better-sqlite3`)
- JSON Web Token (`jsonwebtoken`)
- Password hashing (`bcryptjs`)
- Data demo dinamis (`@faker-js/faker`)

## Prasyarat

- Node.js 18 atau versi yang lebih baru
- npm

## Instalasi

```bash
git clone https://github.com/Megatruh/gateway-zero-trust.git
cd gateway-zero-trust
npm install
cd service-nilai && npm install
cd ../service-transkrip && npm install
cd ..
```

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Isi seluruh nilai wajib pada `.env`. Contoh konfigurasi lokal:

```dotenv
PORT=3000
SERVICE_NILAI_PORT=3001
SERVICE_TRANSKRIP_PORT=3002
GATEWAY_SECRET=super-secret-gateway-key-please-change-in-production
JWT_SECRET=jwt-secret-key-please-change-in-production
GATEWAY_URL=http://localhost:3000

# Service Client Credentials (untuk POST /auth/service)
SERVICE_CLIENT_ID=nilai-service-id
SERVICE_CLIENT_SECRET=nilai-service-secret-key-please-change

# Default Passwords untuk Seeder
SEED_ADMIN_PASSWORD=admin123
SEED_DOSEN_PASSWORD=dosen123
SEED_MHS_PASSWORD=mahasiswa123

ACCESS_HOUR_START=7
ACCESS_HOUR_END=21
```

> Jangan commit file `.env` atau secret ke repository. Gunakan secret yang
> berbeda untuk setiap environment.

## Menjalankan aplikasi

Seeder membuat tabel yang diperlukan, menghapus data lama, lalu mengisi data
demo baru. Jalankan seeder setelah konfigurasi `.env` selesai:

```bash
node scripts/seed.js
```

Jalankan ketiga aplikasi dalam terminal terpisah:

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

## Endpoint

### API Gateway (port 3000)

#### Health check
```http
GET /
```
Tidak memerlukan autentikasi.

#### Login
```http
POST /auth/login
Content-Type: application/json
X-Device-ID: <device-id>
```

Body:
```json
{
  "username": "admin1",
  "password": "admin123"
}
```

Contoh:
```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"username":"admin1","password":"admin123"}'
```

#### Refresh access token
```http
POST /auth/refresh
Content-Type: application/json
X-Device-ID: <device-id>
```

Body:
```json
{
  "refreshToken": "<refresh-token-dari-login>"
}
```

#### Logout
```http
POST /auth/logout
Content-Type: application/json
X-Device-ID: <device-id>
```

Body:
```json
{
  "refreshToken": "<refresh-token-dari-login>"
}
```

#### Get Service Token (untuk inter-service communication)
```http
POST /auth/service
Content-Type: application/json
```

Body:
```json
{
  "client_id": "nilai-service-id",
  "client_secret": "nilai-service-secret-key-please-change"
}
```

#### Endpoint Nilai (proxy ke Service Nilai)
```http
GET /nilai
PUT /nilai/:id
POST /kelas/:id/finalisasi
```

Semua endpoint ini memerlukan:
- Header `X-Device-ID` yang terdaftar
- Header `Authorization: Bearer <access-token>`

#### Endpoint Transkrip (proxy ke Service Transkrip)
```http
GET /transkrip/:nim
POST /transkrip/sinkron
```

Semua endpoint ini memerlukan:
- Header `X-Device-ID` yang terdaftar
- Header `Authorization: Bearer <access-token>` (untuk GET) atau token service (untuk POST /sinkron)

### Service Nilai (port 3001)

Service ini hanya menerima request yang melalui gateway dengan header
`X-Gateway-Secret` yang valid dan token JWT yang valid.

#### GET /nilai
Mengambil data nilai sesuai role:
- Mahasiswa: hanya nilai miliknya sendiri
- Dosen: hanya nilai pada kelas yang diampu
- Admin: semua nilai

#### PUT /nilai/:id
Memperbarui nilai:
- Hanya dosen dan admin
- Hanya pada jam kerja (07:00-21:00)
- Hanya nilai yang belum difinalisasi
- Dosen hanya bisa update nilai pada kelas yang diampu

#### POST /kelas/:id/finalisasi
Memfinalisasi kelas:
- Hanya dosen dan admin
- Hanya pada jam kerja (07:00-21:00)
- Dosen hanya bisa finalisasi kelas yang diampu
- Setelah finalisasi, nilai disinkronkan ke Service Transkrip melalui gateway

### Service Transkrip (port 3002)

Service ini hanya menerima request yang melalui gateway dengan header
`X-Gateway-Secret` yang valid dan token JWT yang valid.

#### GET /transkrip/:nim
Mengambil transkrip mahasiswa:
- Mahasiswa: hanya transkrip miliknya sendiri
- Admin: semua transkrip

#### POST /transkrip/sinkron
Sinkronisasi nilai ke transkrip:
- Hanya menerima token service (role: service)
- Digunakan oleh Service Nilai setelah finalisasi kelas

## Data demo hasil seeding

Password seluruh akun demo ditentukan oleh variabel `.env`, bukan ditulis di
source code. Seeder menyediakan akun utama berikut:

| Role | Username | Device ID |
|---|---|---|
| Admin | `admin1` | `dev-admin-1` |
| Dosen | `dsn_alam-rahmatulloh123` | `dev-dsn-almrhmtl-001` |
| Dosen | `dsn_sidik-asyaky456` | `dev-dsn-sdkasyky-001` |
| Mahasiswa | `mhs_farhan-esha-putra_001` | `dev-mhs-farhan-123` |
| Mahasiswa | `mhs_muhammad-rifki-yusria-hata_002` | `dev-mhs-rifki-456` |
| Mahasiswa | `mhs_yasraf-syifa-maulana_003` | `dev-mhs-yasraf-789` |

Selain akun utama, seeder membuat data dosen dan mahasiswa tambahan secara
acak menggunakan Faker.

> Menjalankan `node scripts/seed.js` menghapus isi tabel `para_pengguna`,
> `kelas`, `nilai`, `transkrip`, dan `audit_logs` sebelum mengisi ulang data.
> Jangan menjalankannya pada database produksi.

## Struktur proyek

```text
.
├── app.js                      # Entry point API Gateway
├── config/
│   ├── db.js                   # Koneksi SQLite
│   └── env.js                  # Validasi dan pembacaan environment
├── middlewares/
│   ├── auth.js                 # Verifikasi JWT dan device pada token
│   └── policyEngine.js         # Verifikasi device ke database
├── routes/
│   └── auth.js                 # Login, refresh, logout, service token
├── scripts/
│   └── seed.js                 # Schema dan data demo
├── services/
│   ├── auditLogger.js          # Pencatatan aktivitas ke audit_logs
│   └── jwtService.js           # Pembuatan dan verifikasi JWT
├── service-nilai/              # Service Nilai (port 3001)
│   ├── app.js
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── middlewares/
│   │   └── auth.js             # Verifikasi gateway secret dan token
│   └── routes/
│       └── nilai.js
├── service-transkrip/          # Service Transkrip (port 3002)
│   ├── app.js
│   ├── config/
│   │   ├── db.js
│   │   └── env.js
│   ├── middlewares/
│   │   └── auth.js             # Verifikasi gateway secret dan token
│   └── routes/
│       └── transkrip.js
├── database.sqlite             # Database SQLite lokal (shared)
├── .env.example                # Template konfigurasi
└── package.json
```

## Kode respons umum

| HTTP | Kode | Keterangan |
|---:|---|---|
| 200 | `ALLOW` | Request berhasil |
| 400 | `MISSING_CREDENTIALS` / `MISSING_DEVICE_ID` / `MISSING_REFRESH_TOKEN` / `MISSING_INPUT` / `UPDATE_FAILED` / `FINALIZE_FAILED` | Input atau header wajib tidak ada, atau operasi gagal |
| 401 | `INVALID_CREDENTIALS` / `UNAUTHORIZED` / `INVALID_TOKEN` | Kredensial atau token tidak tersedia/salah/kedaluwarsa |
| 403 | `DEVICE_MISMATCH` / `UNREGISTERED_DEVICE` / `FORBIDDEN` / `OUT_OF_HOURS` / `INVALID_GATEWAY_SECRET` | Device, role, waktu akses, atau gateway secret tidak diizinkan |
| 404 | `USER_NOT_FOUND` | Pengguna tidak ditemukan |

## Catatan keamanan

- Gunakan HTTPS saat gateway dijalankan di luar localhost.
- Jangan mencatat access token, refresh token, password, atau secret ke log.
- Simpan refresh token pada penyimpanan client yang terlindungi.
- Rotasi `JWT_SECRET` dan `GATEWAY_SECRET` sesuai kebijakan deployment.
- Seeder ditujukan untuk development/demo karena menghapus data lama.
- Service hanya menerima request yang melalui gateway dengan gateway secret yang valid.
- Service juga memverifikasi JWT token (access token atau service token) meskipun gateway secret valid.
- Inter-service communication menggunakan token service yang berlaku 5 menit.
- Pembaruan dan finalisasi nilai dibatasi untuk admin/dosen dan hanya
  diizinkan pada jam kerja 07:00 sampai sebelum 21:00.
- Nilai yang sudah difinalisasi dikunci melalui `is_final = 1`.

## Status pengujian

Belum ada test runner otomatis yang didefinisikan di `package.json`. Untuk
panduan pengujian lengkap untuk demo video, lihat file `PANDUAN_PENGUJIAN.md`.

Validasi manual minimum dapat dilakukan dengan:

1. Menjalankan seeder
2. Menjalankan ketiga aplikasi (gateway, service-nilai, service-transkrip)
3. Memanggil `GET /` pada masing-masing service untuk health check
4. Melakukan login melalui gateway
5. Mengakses `GET /nilai` dengan access token
6. Menggunakan refresh token pada `POST /auth/refresh`
7. Menggunakan `POST /auth/logout` untuk mencabut refresh token
8. Menguji `PUT /nilai/:id` menggunakan akun admin/dosen pada jam kerja
9. Menguji `POST /kelas/:id/finalisasi`, lalu memverifikasi sinkronisasi ke transkrip
10. Mengakses `GET /transkrip/:nim` untuk melihat transkrip
