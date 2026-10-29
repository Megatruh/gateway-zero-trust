require('dotenv').config();

const requireEnv = (key) => {
    if (!process.env[key]) {
        console.error(`[FATAL ERROR] Variabel lingkungan '${key}' tidak ditemukan di file .env!`);
        process.exit(1);
    }
    return process.env[key];
};

module.exports = {
    PORT: process.env.PORT || 3000,
    SERVICE_NILAI_PORT: process.env.SERVICE_NILAI_PORT || 3001,
    SERVICE_TRANSKRIP_PORT: process.env.SERVICE_TRANSKRIP_PORT || 3002,

    GATEWAY_SECRET: requireEnv('GATEWAY_SECRET'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    GATEWAY_URL: process.env.GATEWAY_URL || 'http://localhost:3000',

    SERVICE_CLIENT_ID: requireEnv('SERVICE_CLIENT_ID'),
    SERVICE_CLIENT_SECRET: requireEnv('SERVICE_CLIENT_SECRET'),

    SEED_ADMIN_PASSWORD: requireEnv('SEED_ADMIN_PASSWORD'),
    SEED_DOSEN_PASSWORD: requireEnv('SEED_DOSEN_PASSWORD'),
    SEED_MHS_PASSWORD: requireEnv('SEED_MHS_PASSWORD'),

    ACCESS_HOUR_START: parseInt(process.env.ACCESS_HOUR_START || '7', 10),
    ACCESS_HOUR_END: parseInt(process.env.ACCESS_HOUR_END || '21', 10)
};