const db = require('../config/db');
const config = require('../config/env');
const { logActivity } = require('../services/auditLogger');
const { verifyToken } = require('../services/jwtService');

// Cek jam operasional (07:00 - 21:00)
const isWorkingHours = () => {
    const hours = new Date().getHours();
    return hours >= config.ACCESS_HOUR_START && hours < config.ACCESS_HOUR_END;
};

/**
 * Middleware untuk memverifikasi Device ID terdaftar di database
 * Digunakan di gateway sebelum verifikasi JWT
 */
const verifyDevice = (req, res, next) => {
    // S2S Zero Trust: Jika request membawa Service Token valid, izinkan tanpa device ID fisik
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        const decoded = verifyToken(token);
        if (decoded && decoded.role === 'service') {
            req.deviceId = 'INTERNAL_SERVICE';
            return next();
        }
    }

    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originalUrl || req.url;

    if (!deviceId) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId: null,
            actionResult: 'DENY',
            reason: 'MISSING_DEVICE_ID'
        });

        return res.status(400).json({
            status: "DENY",
            code: "MISSING_DEVICE_ID",
            reason: "Header X-Device-ID wajib disertakan."
        });
    }

    // Cek apakah device terdaftar di database
    const user = db.prepare('SELECT * FROM para_pengguna WHERE device_id = ?').get(deviceId);

    if (!user) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'UNREGISTERED_DEVICE'
        });

        return res.status(403).json({
            status: "DENY",
            code: "UNREGISTERED_DEVICE",
            reason: "Device ID tidak terdaftar di sistem."
        });
    }

    // Sematkan device ID ke request untuk digunakan di middleware berikutnya
    req.deviceId = deviceId;
    next();
};

module.exports = { verifyDevice, isWorkingHours };