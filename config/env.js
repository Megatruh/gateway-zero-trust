require('dotenv').config();

module.exports = {
    PORT: process.env.PORT || 3000,
    GATEWAY_SECRET : process.env.GATEWAY_SECRET || 'super-secret-gateway-key',
    JWT_SECRET : process.env.JWT_SECRET || 'jwt-secret-key',
    SERVICE_NILAI_URL : process.env.SERVICE_NILAI_URL || 'http://localhost:3001',
    SERVICE_TRANKRIP_URL : process.env.SERVICE_TRANSKRIP_URL || 'http://localhost:3002'
}