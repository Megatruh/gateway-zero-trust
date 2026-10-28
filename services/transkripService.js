const db = require('../config/db');

/**
 * Mengambil transkrip nilai mahasiswa berdasarkan NIM
 */
const getTranskripByNim = (nim) => {
    return db.prepare(`
        SELECT t.id, k.nama_kelas, t.nilai_angka
        FROM transkrip t
        JOIN kelas k ON t.kelas_id = k.id
        WHERE t.mahasiswa_nim = ?
    `).all(nim);
};

/**
 * Sinkronisasi data dari Service Nilai ke Transkrip saat nilai di-finalize
 */
const syncToTranskrip = (kelasId, mahasiswaNim, nilaiAngka) => {
    // Cek apakah data transkrip sudah ada
    const existing = db.prepare(`
        SELECT id FROM transkrip WHERE mahasiswa_nim = ? AND kelas_id = ?
    `).get(mahasiswaNim, kelasId);

    if (existing) {
        db.prepare(`
            UPDATE transkrip SET nilai_angka = ? WHERE id = ?
        `).run(nilaiAngka, existing.id);
    } else {
        db.prepare(`
            INSERT INTO transkrip (mahasiswa_nim, kelas_id, nilai_angka)
            VALUES (?, ?, ?)
        `).run(mahasiswaNim, kelasId, nilaiAngka);
    }

    return true;
};

module.exports = {
    getTranskripByNim,
    syncToTranskrip
};