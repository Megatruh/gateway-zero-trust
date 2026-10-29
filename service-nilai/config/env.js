const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const requireEnv = (key) => {
    if (!process.env[key]) {
        console.error(`[FATAL ERROR] Variabel lingkungan '${key}' tidak ditemukan di file .env!`);
        process.exit(1);
    }
    return process.env[key];
};

module.exports = {
    PORT: process.env.SERVICE_NILAI_PORT || 3001,
    GATEWAY_SECRET: requireEnv('GATEWAY_SECRET'),
    JWT_SECRET: requireEnv('JWT_SECRET'),
    GATEWAY_URL: process.env.GATEWAY_URL || 'http://localhost:3000',
    SERVICE_CLIENT_ID: requireEnv('SERVICE_CLIENT_ID'),
    SERVICE_CLIENT_SECRET: requireEnv('SERVICE_CLIENT_SECRET')
};
