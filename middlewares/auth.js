const { verifyToken } = require('../services/jwtService');
const { logActivity } = require('../services/auditLogger');

/**
 * Middleware untuk memverifikasi JWT Access Token & memastikan Device ID cocok (Zero Trust Strict Check)
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originalUrl || req.url;

    // 1. Ekstrak Bearer token dari header Authorization
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId: deviceId || null,
            actionResult: 'DENY',
            reason: 'MISSING_ACCESS_TOKEN'
        });

        return res.status(401).json({
            status: "DENY",
            code: "UNAUTHORIZED",
            reason: "Access token (Bearer) wajib disertakan."
        });
    }

    // 2. Verifikasi keabsahan JWT token
    const decoded = verifyToken(token);

    if (!decoded) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId: deviceId || null,
            actionResult: 'DENY',
            reason: 'INVALID_OR_EXPIRED_TOKEN'
        });

        return res.status(403).json({
            status: "DENY",
            code: "INVALID_TOKEN",
            reason: "Access token tidak valid atau sudah kadaluwarsa."
        });
    }

    // 3. Zero Trust Strict Check: Pastikan Device ID di Token sama dengan Device ID di Header saat ini
    if (decoded.deviceId !== deviceId) {
        logActivity({
            subject: decoded.username || 'UNKNOWN_USER',
            endpoint,
            deviceId: deviceId || null,
            actionResult: 'DENY',
            reason: 'JWT_DEVICE_MISMATCH'
        });

        return res.status(403).json({
            status: "DENY",
            code: "DEVICE_MISMATCH",
            reason: "Token ini diterbitkan untuk perangkat yang berbeda!"
        });
    }

    // Sematkan data pengguna yang sudah terverifikasi ke objek req.user
    req.user = decoded;
    next();
};

module.exports = {
    authenticateToken
};