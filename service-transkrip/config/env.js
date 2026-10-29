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
    PORT: process.env.SERVICE_TRANSKRIP_PORT || 3002,
    GATEWAY_SECRET: requireEnv('GATEWAY_SECRET'),
    JWT_SECRET: requireEnv('JWT_SECRET')
};
