const config = require('../config/env');
const { logActivity } = require('../services/auditLogger');

/**
 * Middleware untuk memverifikasi Internal Service Token (Zero Trust S2S)
 */
const verifyServiceToken = (req, res, next) => {
    const serviceToken = req.headers['x-service-token'];
    const endpoint = req.originalUrl || req.url;

    if (!serviceToken || serviceToken !== config.GATEWAY_SECRET) {
        logActivity({
            subject: 'UNAUTHORIZED_SERVICE',
            endpoint,
            deviceId: req.headers['x-device-id'] || 'UNKNOWN',
            actionResult: 'DENY',
            reason: 'INVALID_SERVICE_TOKEN'
        });

        return res.status(403).json({
            status: "DENY",
            code: "SERVICE_UNAUTHORIZED",
            reason: "Akses ditolak. Service Token internal tidak valid atau tidak disertakan."
        });
    }

    next();
};

module.exports = { verifyServiceToken };