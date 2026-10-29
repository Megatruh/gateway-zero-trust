const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Middleware untuk memverifikasi Gateway Secret
 * Service hanya menerima request yang melalui gateway
 */
const verifyGatewaySecret = (req, res, next) => {
    const gatewaySecret = req.headers['x-gateway-secret'];

    console.log(`[SERVICE NILAI AUTH] Received gateway secret: ${gatewaySecret ? gatewaySecret.substring(0, 10) + '...' : 'NONE'}`);
    console.log(`[SERVICE NILAI AUTH] Expected gateway secret: ${config.GATEWAY_SECRET.substring(0, 10) + '...'}`);

    if (!gatewaySecret || gatewaySecret !== config.GATEWAY_SECRET) {
        return res.status(403).json({
            status: "DENY",
            code: "INVALID_GATEWAY_SECRET",
            reason: "Akses ditolak. Request tidak melalui gateway yang valid."
        });
    }

    next();
};

/**
 * Middleware untuk memverifikasi JWT Token (Access Token atau Service Token)
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            status: "DENY",
            code: "MISSING_TOKEN",
            reason: "Authorization Bearer token wajib disertakan."
        });
    }

    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            status: "DENY",
            code: "INVALID_TOKEN",
            reason: "Token tidak valid atau sudah kedaluwarsa."
        });
    }
};

/**
 * Middleware untuk memverifikasi Service Token (role: service)
 */
const verifyServiceToken = (req, res, next) => {
    if (!req.user || req.user.role !== 'service') {
        return res.status(403).json({
            status: "DENY",
            code: "FORBIDDEN",
            reason: "Akses ditolak. Hanya token service yang diizinkan."
        });
    }
    next();
};

module.exports = {
    verifyGatewaySecret,
    verifyToken,
    verifyServiceToken
};
