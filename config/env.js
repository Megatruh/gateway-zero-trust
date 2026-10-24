require('dotenv').config();

/**
 * Helper untuk memastikan variabel sensitif wajib ada di .env.
 * Jika tidak ditemukan, aplikasi akan langsung dihentikan (fail-fast).
 */
const requireEnv = (key) => {
    if (!process.env[key]) {
        console.error(`[FATAL ERROR] Variabel lingkungan '${key}' tidak ditemukan di file .env!`);
        process.exit(1); // Hentikan eksekusi program
    }
    return process.env[key];
};

module.exports = {
    // Port & Secret
    PORT: process.env.PORT || 3000,
    GATEWAY_SECRET: requireEnv('GATEWAY_SECRET'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    
    // Service URLs
    SERVICE_NILAI_URL: process.env.SERVICE_NILAI_URL || 'http://localhost:3001',
    SERVICE_TRANSKRIP_URL: process.env.SERVICE_TRANSKRIP_URL || 'http://localhost:3002',

    // Default Passwords (Diambil wajib dari .env tanpa fallback di kode)
    SEED_ADMIN_PASSWORD: requireEnv('SEED_ADMIN_PASSWORD'),
    SEED_DOSEN_PASSWORD: requireEnv('SEED_DOSEN_PASSWORD'),
    SEED_MHS_PASSWORD: requireEnv('SEED_MHS_PASSWORD'),

    // Jam Operasional Edit/Finalisasi Nilai
    ACCESS_HOUR_START: parseInt(process.env.ACCESS_HOUR_START || '7', 10),
    ACCESS_HOUR_END: parseInt(process.env.ACCESS_HOUR_END || '21', 10)
};