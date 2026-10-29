const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyServiceToken } = require('../middlewares/auth');

// GET /transkrip/:nim - Ambil transkrip mahasiswa sesuai role
router.get('/:nim', (req, res) => {
    const nim = req.params.nim;
    const { role, nim_or_nip } = req.user;

    // Mahasiswa hanya bisa melihat transkrip miliknya sendiri
    if (role === 'mahasiswa' && nim !== nim_or_nip) {
        return res.status(403).json({
            status: "DENY",
            code: "FORBIDDEN",
            reason: "Mahasiswa hanya dapat melihat transkrip miliknya sendiri."
        });
    }

    const transkripData = db.prepare(`
        SELECT t.id, t.mahasiswa_nim, u.nama AS nama_mahasiswa, k.nama_kelas, t.nilai_angka
        FROM transkrip t
        JOIN para_pengguna u ON t.mahasiswa_nim = u.nim_or_nip
        JOIN kelas k ON t.kelas_id = k.id
        WHERE t.mahasiswa_nim = ?
    `).all(nim);

    res.json({
        status: "ALLOW",
        message: "Berhasil mengambil data transkrip.",
        data: transkripData
    });
});

// POST /transkrip/sinkron - Sinkronisasi nilai ke transkrip (hanya token service)
router.post('/sinkron', verifyServiceToken, (req, res) => {
    const { kelas_id, mahasiswa_nim, nilai_angka } = req.body;

    if (!kelas_id || !mahasiswa_nim || nilai_angka === undefined) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_INPUT",
            reason: "Field kelas_id, mahasiswa_nim, dan nilai_angka wajib diisi."
        });
    }

    // Cek apakah sudah ada di transkrip, jika ada update, jika tidak insert
    const existing = db.prepare('SELECT * FROM transkrip WHERE kelas_id = ? AND mahasiswa_nim = ?').get(kelas_id, mahasiswa_nim);

    if (existing) {
        db.prepare('UPDATE transkrip SET nilai_angka = ? WHERE kelas_id = ? AND mahasiswa_nim = ?')
            .run(nilai_angka, kelas_id, mahasiswa_nim);
    } else {
        db.prepare('INSERT INTO transkrip (kelas_id, mahasiswa_nim, nilai_angka) VALUES (?, ?, ?)')
            .run(kelas_id, mahasiswa_nim, nilai_angka);
    }

    res.json({
        status: "ALLOW",
        message: "Data berhasil disinkronkan ke transkrip."
    });
});

module.exports = router;
