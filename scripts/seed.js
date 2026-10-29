const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const { faker } = require("@faker-js/faker");
const path = require("path");
const config = require("../config/env");

const dbPath = path.join(__dirname, "..", "database.sqlite");
const db = new Database(dbPath);

const saltRounds = 10;

console.log("[SEED] Inisialisasi Database & Hashing Password...");

// Hash default password dari .env
const hashedAdminPass = bcrypt.hashSync(
  config.SEED_ADMIN_PASSWORD,
  saltRounds,
);
const hashedDosenPass = bcrypt.hashSync(
  config.SEED_DOSEN_PASSWORD,
  saltRounds,
);
const hashedMhsPass = bcrypt.hashSync(config.SEED_MHS_PASSWORD, saltRounds);

// TABEL para_pengguna, nilai, kelas, transkrip, audit_logs
db.exec(`
    CREATE TABLE IF NOT EXISTS para_pengguna (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN('admin', 'dosen', 'mahasiswa')) NOT NULL,
        nim_or_nip TEXT UNIQUE,
        device_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kelas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_kelas TEXT NOT NULL,
        dosen_nip TEXT NOT NULL,
        FOREIGN KEY (dosen_nip) REFERENCES para_pengguna(nim_or_nip)
    );

    CREATE TABLE IF NOT EXISTS nilai (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kelas_id INTEGER NOT NULL,
        mahasiswa_nim TEXT NOT NULL,
        nilai_angka REAL DEFAULT 0,
        is_final INTEGER DEFAULT 0 CHECK(is_final IN(0, 1)),
        FOREIGN KEY (kelas_id) REFERENCES kelas(id),
        FOREIGN KEY (mahasiswa_nim) REFERENCES para_pengguna(nim_or_nip)
    );
        
    CREATE TABLE IF NOT EXISTS transkrip (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mahasiswa_nim TEXT NOT NULL,
        kelas_id INTEGER NOT NULL,
        nilai_angka REAL NOT NULL,
        FOREIGN KEY (mahasiswa_nim) REFERENCES para_pengguna(nim_or_nip),
        FOREIGN KEY (kelas_id) REFERENCES kelas(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        subject TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        device_id TEXT NOT NULL,
        action_result TEXT CHECK(action_result IN('ALLOW', 'DENY')) NOT NULL,
        reason TEXT
    );
`);

// Migrasikan database lama yang belum memiliki kolom nama
const penggunaColumns = db
  .prepare("PRAGMA table_info(para_pengguna)")
  .all()
  .map((column) => column.name);

if (!penggunaColumns.includes("nama")) {
  db.exec("ALTER TABLE para_pengguna ADD COLUMN nama TEXT NOT NULL DEFAULT ''");
}

// Migrasikan database lama yang belum memiliki kolom refresh_token
if (!penggunaColumns.includes("refresh_token")) {
  db.exec("ALTER TABLE para_pengguna ADD COLUMN refresh_token TEXT");
}

// Reset data lama
db.exec(
  `DELETE FROM transkrip; DELETE FROM nilai; DELETE FROM kelas; DELETE FROM para_pengguna; DELETE FROM audit_logs; DELETE FROM sqlite_sequence;`,
);

const insertUser = db.prepare(`
    INSERT INTO para_pengguna (nama, username, password, role, nim_or_nip, device_id) 
    VALUES (?, ?, ?, ?, ?, ?)
`);

// 1. Data Admin Utama
insertUser.run(
  "Mas Admin",
  "admin1",
  hashedAdminPass,
  "admin",
  "ADM001",
  "dev-admin-1",
);

// 2. Data Dosen Utama
const para_dosen = [
  {
    nama: "Ir. Alam Rahmatulloh, S.T., M.T., MCE., IPM.",
    username: "dsn_alam-rahmatulloh123",
    nip: "198712212019031007",
    device: "dev-dsn-almrhmtl-001",
  },
  {
    nama: "Muhammad Sidik Asyaky, S.T., M.T.",
    username: "dsn_sidik-asyaky456",
    nip: "199608202024061002",
    device: "dev-dsn-sdkasyky-001",
  },
];

para_dosen.forEach((d) =>
  insertUser.run(d.nama, d.username, hashedDosenPass, "dosen", d.nip, d.device),
);

// Tambah 5 Dosen Acak via Faker
for (let i = 0; i < 5; i++) {
  const nama = faker.person.fullName();
  const nip = faker.string.numeric(18);
  const username = faker.internet.username().toLowerCase();
  const device = `dev-${faker.string.alphanumeric(8)}`;
  para_dosen.push({ nama, username, nip, device });
  insertUser.run(nama, username, hashedDosenPass, "dosen", nip, device);
}

// 3. Data Mahasiswa Utama
const mahasiswas = [
  {
    nama: "Farhan Esha Putra",
    username: "mhs_farhan-esha-putra_001",
    nim: "247006001",
    device: "dev-mhs-farhan-123",
  },
  {
    nama: "Muhammad Rifki Yusria Hata",
    username: "mhs_muhammad-rifki-yusria-hata_002",
    nim: "247006002",
    device: "dev-mhs-rifki-456",
  },
  {
    nama: "Yasraf Syifa Maulana",
    username: "mhs_yasraf-syifa-maulana_003",
    nim: "247006003",
    device: "dev-mhs-yasraf-789",
  },
];

mahasiswas.forEach((m) =>
  insertUser.run(
    m.nama,
    m.username,
    hashedMhsPass,
    "mahasiswa",
    m.nim,
    m.device,
  ),
);

// Tambah 50 Mahasiswa Acak via Faker
for (let i = 0; i < 50; i++) {
  const nama = faker.person.fullName();
  const nim = faker.string.numeric(9);
  const username = faker.internet.username().toLowerCase();
  const device = `dev-${faker.string.alphanumeric(8)}`;
  mahasiswas.push({ nama, username, nim, device });
  insertUser.run(nama, username, hashedMhsPass, "mahasiswa", nim, device);
}

// 4. Data Kelas
const insertKelas = db.prepare(`
    INSERT INTO kelas (nama_kelas, dosen_nip) VALUES (?, ?)    
`);
const daftarKelas = [
  { nama: "Keamanan Informasi A", dosen: para_dosen[0].nip },
  { nama: "Komputasi Awan B", dosen: para_dosen[1].nip },
  { nama: "Kecerdasan Buatan C", dosen: para_dosen[2].nip },
];
const kelasIds = [];
daftarKelas.forEach((k) => {
  const res = insertKelas.run(k.nama, k.dosen);
  kelasIds.push(res.lastInsertRowid);
});

// 5. Data Nilai
const insertNilai = db.prepare(`
    INSERT INTO nilai (kelas_id, mahasiswa_nim, nilai_angka, is_final) 
    VALUES (?, ?, ?, ?)
`);
// Pastikan mahasiswa pertama (Farhan) terdaftar di Kelas 1 (Keamanan Informasi A) untuk keperluan testing sesuai panduan
insertNilai.run(kelasIds[0], mahasiswas[0].nim, 78.5, 0);

// Mahasiswa berikutnya
mahasiswas.slice(1).forEach((mhs) => {
  const randomKelasId = faker.helpers.arrayElement(kelasIds);
  const randomNilai = faker.number.float({
    min: 65,
    max: 98,
    fractionDigits: 1,
  });
  insertNilai.run(randomKelasId, mhs.nim, randomNilai, 0);
});

console.log(
  "[SEED] Berhasil! Seluruh data terisi & password telah di-hash dengan bcrypt.",
);
db.close();
