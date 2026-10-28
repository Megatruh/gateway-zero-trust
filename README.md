# Gateway Zero Trust

API gateway sederhana berbasis Node.js/Express untuk simulasi arsitektur
**Zero Trust** pada sistem akademik. Setiap request yang mengakses data
terproteksi harus melewati dua pemeriksaan:

1. `X-Device-ID` harus terdaftar dan cocok dengan pengguna di database.
2. Access token JWT harus valid dan diterbitkan untuk device yang sama.

Gateway menyediakan autentikasi pengguna, refresh access token, pemeriksaan
device, endpoint data nilai simulasi dengan kontrol akses berbasis role, serta
audit log untuk keputusan `ALLOW` dan `DENY`.

## Fitur

- Login dengan username, password bcrypt, dan device ID.
- Access token JWT dengan masa berlaku 15 menit.
- Refresh token JWT dengan masa berlaku 7 hari.
- Verifikasi device pada login, refresh token, dan endpoint terproteksi.
- Kontrol akses data nilai berdasarkan role pengguna.
- Pembaruan dan finalisasi nilai oleh admin/dosen pada jam kerja.
- SQLite melalui `better-sqlite3`.
- Seeder untuk membuat schema dan data demo.
- Audit log untuk aktivitas autentikasi dan akses device.
- Fail-fast apabila secret atau password seeder wajib belum dikonfigurasi.

## Teknologi

- Node.js
- Express 5
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
```

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Isi seluruh nilai wajib pada `.env`. Contoh konfigurasi lokal:

```dotenv
PORT=3000
GATEWAY_SECRET=ganti-dengan-secret-gateway-yang-kuat
JWT_SECRET=ganti-dengan-secret-jwt-yang-kuat
SERVICE_NILAI_URL=http://localhost:3001
SERVICE_TRANSKRIP_URL=http://localhost:3002

SEED_ADMIN_PASSWORD=password-admin-lokal
SEED_DOSEN_PASSWORD=password-dosen-lokal
SEED_MHS_PASSWORD=password-mahasiswa-lokal

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

Kemudian jalankan gateway:

```bash
node app.js
```

Server berjalan pada `http://localhost:3000` secara default. `package.json`
saat ini belum menyediakan script `start` atau `dev`, sehingga aplikasi
dijalankan langsung dengan `node app.js`.

## Endpoint

### Health check

```http
GET /
```

Tidak memerlukan autentikasi.

Contoh respons:

```json
{
  "status": "ONLINE",
  "service": "Zero Trust API Gateway",
  "version": "1.0.0",
  "timestamp": "2026-10-26T00:00:00.000Z"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json
X-Device-ID: <device-id>
```

Body:

```json
{
  "username": "admin1",
  "password": "password-admin-lokal"
}
```

Contoh:

```bash
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d '{"username":"admin1","password":"password-admin-lokal"}'
```

Respons sukses berisi:

- informasi dasar pengguna;
- `accessToken`;
- `refreshToken`.

### Refresh access token

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

Contoh dengan `jq`:

```bash
REFRESH_TOKEN="<refresh-token-dari-login>"

curl -i -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-admin-1" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}"
```

Header `X-Device-ID` harus sama dengan device ID yang tertanam di refresh
token. Endpoint ini hanya menerbitkan access token baru; refresh token lama
tetap menjadi tanggung jawab client untuk disimpan secara aman.

### Mengakses data nilai terproteksi

```http
GET /nilai
X-Device-ID: <device-id>
Authorization: Bearer <access-token>
```

Contoh:

```bash
ACCESS_TOKEN="<access-token-dari-login>"

curl -i http://localhost:3000/nilai \
  -H "X-Device-ID: dev-admin-1" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Urutan middleware endpoint ini adalah:

1. `verifyDevice`: memastikan device terdaftar di `para_pengguna`.
2. `authenticateToken`: memverifikasi JWT dan kecocokan device pada token.

Data yang dikembalikan bergantung pada role:

- `admin` dan `dosen` dapat melihat seluruh data nilai.
- `mahasiswa` hanya dapat melihat nilai dengan `mahasiswa_nim` miliknya.

### Memperbarui nilai

```http
PUT /nilai/:id
Content-Type: application/json
X-Device-ID: <device-id>
Authorization: Bearer <access-token>
```

Body:

```json
{
  "nilaiAngka": 85
}
```

Contoh:

```bash
curl -i -X PUT http://localhost:3000/nilai/1 \
  -H "Content-Type: application/json" \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"nilaiAngka":85}'
```

Endpoint ini hanya dapat digunakan oleh `admin` dan `dosen` pada jam kerja
07:00 sampai sebelum 21:00. Nilai yang sudah difinalisasi tidak dapat
diperbarui. Field `nilaiAngka` wajib disertakan.

### Memfinalisasi dan mengunci nilai

```http
POST /nilai/finalize/:id
X-Device-ID: <device-id>
Authorization: Bearer <access-token>
```

Contoh:

```bash
curl -i -X POST http://localhost:3000/nilai/finalize/1 \
  -H "X-Device-ID: dev-dsn-almrhmtl-001" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Finalisasi hanya dapat dilakukan oleh `admin` dan `dosen` pada jam kerja
07:00 sampai sebelum 21:00. Setelah berhasil, `is_final` diubah menjadi `1`
dan nilai tidak dapat diperbarui lagi.

Semua endpoint di bawah `/nilai` memerlukan `X-Device-ID` yang terdaftar,
access token JWT yang valid, serta kecocokan device ID pada header dan token.

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
├── app.js                  # Entry point Express
├── config/
│   ├── db.js               # Koneksi SQLite
│   └── env.js              # Validasi dan pembacaan environment
├── middlewares/
│   ├── auth.js             # Verifikasi JWT dan device pada token
│   └── policyEngine.js     # Verifikasi device ke database
├── routes/
│   ├── auth.js             # Login dan refresh token
│   └── nilai.js            # Baca, ubah, dan finalisasi nilai
├── scripts/
│   └── seed.js             # Schema dan data demo
├── services/
│   ├── auditLogger.js      # Pencatatan aktivitas ke audit_logs
│   ├── jwtService.js       # Pembuatan dan verifikasi JWT
│   └── nilaiService.js     # Akses, pembaruan, dan finalisasi nilai
├── database.sqlite         # Database SQLite lokal
├── .env.example            # Template konfigurasi
└── package.json
```

## Kode respons umum

| HTTP | Kode | Keterangan |
|---:|---|---|
| 200 | `ALLOW` | Request berhasil |
| 400 | `MISSING_CREDENTIALS` / `MISSING_DEVICE_ID` / `MISSING_REFRESH_TOKEN` / `MISSING_INPUT` / `UPDATE_FAILED` / `FINALIZE_FAILED` | Input atau header wajib tidak ada, atau operasi nilai gagal |
| 401 | `INVALID_CREDENTIALS` / `UNAUTHORIZED` | Kredensial atau access token tidak tersedia/salah |
| 403 | `INVALID_TOKEN` / `DEVICE_MISMATCH` / `UNREGISTERED_DEVICE` / `FORBIDDEN` / `OUT_OF_HOURS` | Token, device, role, atau waktu akses tidak diizinkan |
| 404 | `USER_NOT_FOUND` | Pengguna pada refresh token tidak ditemukan |

## Catatan keamanan

- Gunakan HTTPS saat gateway dijalankan di luar localhost.
- Jangan mencatat access token, refresh token, password, atau secret ke log.
- Simpan refresh token pada penyimpanan client yang terlindungi.
- Rotasi `JWT_SECRET` dan `GATEWAY_SECRET` sesuai kebijakan deployment.
- Seeder ditujukan untuk development/demo karena menghapus data lama.
- Endpoint `/nilai` menerapkan kontrol akses berbasis role: admin/dosen dapat
  melihat seluruh nilai, sedangkan mahasiswa hanya dapat melihat nilainya
  sendiri.
- Pembaruan dan finalisasi nilai dibatasi untuk admin/dosen dan hanya
  diizinkan pada jam kerja 07:00 sampai sebelum 21:00.
- Nilai yang sudah difinalisasi dikunci melalui `is_final = 1`.

## Status pengujian

Belum ada test runner otomatis yang didefinisikan di `package.json`. Validasi
manual minimum dapat dilakukan dengan:

1. menjalankan seeder;
2. menjalankan `node app.js`;
3. memanggil `GET /`;
4. melakukan login;
5. memakai access token pada `GET /nilai`;
6. memakai refresh token pada `POST /auth/refresh`;
7. menguji `PUT /nilai/:id` menggunakan akun admin/dosen pada jam kerja;
8. menguji `POST /nilai/finalize/:id`, lalu memastikan nilai yang sudah
   difinalisasi tidak dapat diperbarui lagi.
