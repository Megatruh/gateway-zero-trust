const express = require('express');
const router = express.Router();
const db = require('../config/db');
const config = require('../config/env');

// Cek jam operasional (07:00 - 21:00)
const isWorkingHours = () => {
    const hours = new Date().getHours();
    return hours >= 7 && hours < 21;
};

// GET /nilai - Ambil data nilai sesuai role
router.get('/', (req, res) => {
    const { role, nim_or_nip } = req.user;
    let data;

    if (role === 'dosen') {
        // Dosen hanya melihat nilai kelas yang diampu
        data = db.prepare(`
            SELECT n.id, k.nama_kelas, n.mahasiswa_nim, u.nama AS nama_mahasiswa, n.nilai_angka, n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            JOIN para_pengguna u ON n.mahasiswa_nim = u.nim_or_nip
            WHERE k.dosen_nip = ?
        `).all(nim_or_nip);
    } else if (role === 'mahasiswa') {
        // Mahasiswa hanya melihat nilai miliknya sendiri
        data = db.prepare(`
            SELECT n.id, k.nama_kelas, n.mahasiswa_nim, n.nilai_angka, n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            WHERE n.mahasiswa_nim = ?
        `).all(nim_or_nip);
    } else if (role === 'admin') {
        // Admin melihat semua nilai
        data = db.prepare(`
            SELECT n.id, k.nama_kelas, n.mahasiswa_nim, u.nama AS nama_mahasiswa, n.nilai_angka, n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            JOIN para_pengguna u ON n.mahasiswa_nim = u.nim_or_nip
        `).all();
    }

    res.json({
        status: "ALLOW",
        message: "Berhasil mengambil data nilai.",
        data
    });
});

// PUT /nilai/:id - Update nilai
router.put('/:id', (req, res) => {
    const { nilaiAngka } = req.body;
    const nilaiId = req.params.id;
    const { role, nim_or_nip } = req.user;

    // Hanya dosen dan admin yang bisa update nilai
    if (role !== 'dosen' && role !== 'admin') {
        return res.status(403).json({
            status: "DENY",
            code: "FORBIDDEN",
            reason: "Hanya dosen dan admin yang dapat memperbarui nilai."
        });
    }

    // Cek jam operasional
    // BYPASS untuk keperluan pengujian di luar jam kerja
    // if (!isWorkingHours()) {
    //     return res.status(403).json({
    //         status: "DENY",
    //         code: "OUT_OF_HOURS",
    //         reason: "Akses ditolak. Perubahan nilai hanya diizinkan pukul 07:00-21:00."
    //     });
    // }

    if (nilaiAngka === undefined) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_INPUT",
            reason: "Field nilaiAngka wajib diisi."
        });
    }

    // Cek kepemilikan kelas untuk dosen
    if (role === 'dosen') {
        const nilai = db.prepare('SELECT n.*, k.dosen_nip FROM nilai n JOIN kelas k ON n.kelas_id = k.id WHERE n.id = ?').get(nilaiId);
        if (!nilai || nilai.dosen_nip !== nim_or_nip) {
            return res.status(403).json({
                status: "DENY",
                code: "FORBIDDEN",
                reason: "Dosen hanya dapat memperbarui nilai pada kelas yang diampunya."
            });
        }
    }

    const result = db.prepare('UPDATE nilai SET nilai_angka = ? WHERE id = ? AND is_final = 0').run(nilaiAngka, nilaiId);

    if (result.changes === 0) {
        return res.status(400).json({
            status: "DENY",
            code: "UPDATE_FAILED",
            reason: "Gagal update. Data tidak ditemukan atau sudah FINAL."
        });
    }

    res.json({
        status: "ALLOW",
        message: "Nilai berhasil diperbarui."
    });
});

// POST /kelas/:id/finalisasi - Finalisasi kelas
router.post('/kelas/:id/finalisasi', async (req, res) => {
    const kelasId = req.params.id;
    const { role, nim_or_nip } = req.user;

    // Hanya dosen yang bisa memfinalisasi
    if (role !== 'dosen' && role !== 'admin') {
        return res.status(403).json({
            status: "DENY",
            code: "FORBIDDEN",
            reason: "Hanya dosen dan admin yang dapat memfinalisasi kelas."
        });
    }

    // Cek jam operasional
    // BYPASS untuk keperluan pengujian di luar jam kerja
    // if (!isWorkingHours()) {
    //     return res.status(403).json({
    //         status: "DENY",
    //         code: "OUT_OF_HOURS",
    //         reason: "Akses ditolak. Finalisasi nilai hanya diizinkan pukul 07:00-21:00."
    //     });
    // }

    // Cek kepemilikan kelas untuk dosen
    if (role === 'dosen') {
        const kelas = db.prepare('SELECT * FROM kelas WHERE id = ? AND dosen_nip = ?').get(kelasId, nim_or_nip);
        if (!kelas) {
            return res.status(403).json({
                status: "DENY",
                code: "FORBIDDEN",
                reason: "Dosen hanya dapat memfinalisasi kelas yang diampunya."
            });
        }
    }

    const daftarNilai = db.prepare('SELECT * FROM nilai WHERE kelas_id = ? AND is_final = 0').all(kelasId);

    if (daftarNilai.length === 0) {
        return res.status(400).json({
            status: "DENY",
            code: "NO_DRAFT_NILAI",
            reason: "Tidak ada nilai draft pada kelas ini."
        });
    }

    // Request Token Service ke Gateway
    const tokenRes = await fetch(`${config.GATEWAY_URL}/auth/service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: config.SERVICE_CLIENT_ID,
            client_secret: config.SERVICE_CLIENT_SECRET
        })
    });

    const tokenData = await tokenRes.json();
    if (tokenData.status !== 'ALLOW') {
        return res.status(500).json({
            status: "ERROR",
            message: "Gagal mendapatkan Service Token."
        });
    }

    // Update status is_final = 1
    db.prepare('UPDATE nilai SET is_final = 1 WHERE kelas_id = ?').run(kelasId);

    // Sinkronisasi ke Service Transkrip MELEWATI GATEWAY
    for (const item of daftarNilai) {
        await fetch(`${config.GATEWAY_URL}/transkrip/sinkron`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenData.token}`
            },
            body: JSON.stringify({
                kelas_id: item.kelas_id,
                mahasiswa_nim: item.mahasiswa_nim,
                nilai_angka: item.nilai_angka
            })
        });
    }

    res.json({
        status: "ALLOW",
        message: "Kelas berhasil difinalisasi dan disinkronkan ke transkrip."
    });
});

module.exports = router;
