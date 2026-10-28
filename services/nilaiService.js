const db = require('../config/db');

/**
 * Memeriksa apakah waktu saat ini berada dalam jam operasional (07:00 - 21:00)
 */
const isWorkingHours = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 7 && hours < 21;
};

/**
 * Mengambil data nilai berdasarkan role pengguna
 */
const getNilai = (user) => {
    if (user.role === 'admin' || user.role === 'dosen') {
        return db.prepare(`
            SELECT n.id, k.nama_kelas, n.mahasiswa_nim, u.nama AS nama_mahasiswa, n.nilai_angka, n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            JOIN para_pengguna u ON n.mahasiswa_nim = u.nim_or_nip
        `).all();
    } else {
        // Mahasiswa hanya bisa melihat nilainya sendiri
        return db.prepare(`
            SELECT n.id, k.nama_kelas, n.mahasiswa_nim, n.nilai_angka, n.is_final
            FROM nilai n
            JOIN kelas k ON n.kelas_id = k.id
            WHERE n.mahasiswa_nim = ?
        `).all(user.nim_or_nip);
    }
};

/**
 * Input / Update Nilai Mahasiswa (Hanya Dosen/Admin & Harus di Jam Kerja)
 */
const updateNilai = (id, nilaiAngka, user) => {
    // 1. Check RBAC (Otorisasi Peran Utama)
    if (user.role !== 'dosen' && user.role !== 'admin') {
        return {
            success: false,
            code: "FORBIDDEN",
            message: "Hanya Dosen dan Admin yang diizinkan memperbarui nilai."
        };
    }

    // 2. Check Jam Kerja (Kondisi Kontekstual Dosen/Admin)
    if (!isWorkingHours()) {
        return {
            success: false,
            code: "OUT_OF_HOURS",
            message: "Akses ditolak. Input nilai hanya diizinkan pada jam kerja (07:00 - 21:00)."
        };
    }

    // 3. Update DB
    const stmt = db.prepare('UPDATE nilai SET nilai_angka = ? WHERE id = ? AND is_final = 0');
    const result = stmt.run(nilaiAngka, id);

    if (result.changes === 0) {
        return {
            success: false,
            code: "UPDATE_FAILED",
            message: "Gagal memperbarui nilai. Data tidak ditemukan atau nilai sudah berstatus FINAL."
        };
    }

    return {
        success: true,
        message: "Nilai berhasil diperbarui."
    };
};

    
    //3. Finalisasi Nilai (Hanya Dosen/Admin & Harus di Jam Kerja)
    
const finalizeNilai = (id, user) => {
    // 1. Check RBAC
    if (user.role !== 'dosen' && user.role !== 'admin') {
        return {
            success: false,
            code: "FORBIDDEN",
            message: "Hanya Dosen dan Admin yang diizinkan memfinalisasi nilai."
        };
    }

    // 2. Check Jam Kerja
    if (!isWorkingHours()) {
        return {
            success: false,
            code: "OUT_OF_HOURS",
            message: "Akses ditolak. Finalisasi nilai hanya diizinkan pada jam kerja (07:00 - 21:00)."
        };
    }

    // 3. Update DB: Set is_final = 1
    const stmt = db.prepare('UPDATE nilai SET is_final = 1 WHERE id = ? AND is_final = 0');
    const result = stmt.run(id);

    if (result.changes === 0) {
        return {
            success: false,
            code: "FINALIZE_FAILED",
            message: "Gagal memfinalisasi nilai. Data tidak ditemukan atau nilai sudah berstatus FINAL sebelumnya."
        };
    }

    return {
        success: true,
        message: "Nilai berhasil difinalisasi dan dikunci."
    };
};


module.exports = {
    isWorkingHours,
    getNilai,
    updateNilai,
    finalizeNilai
};