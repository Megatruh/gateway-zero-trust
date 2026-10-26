const db = require('../config/db');
const { logActivity } = require('../services/auditLogger');

// Middleware untuk memverifikasi apakah X-Device-ID terdaftar di database
const verifyDevice = (req, res, next) => {
    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originaUrl || req.url;

    // 1. Skenario DENY: Header tidak dikirim
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
            reason: "Header X-Device-ID wajib disertakan untuk setiap request user."
        });
    }

    // 2. Cari user berdasarkan device_id di database
    const user = db.prepare('SELECT id, username, role, nim_or_nip FROM para_pengguna WHERE device_id = ?').get(deviceId);

    // 3. Skenario DENY: Device ID tidak terdaftar
    if (!user) {
        logActivity({
            subject: 'UNREGISTERED_DEVICE',
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'UNREGISTERED_DEVICE'
        });

        return res.status(403).json({
            status: "DENY",
            code: "UNREGISTERED_DEVICE",
            reason: "Device ID tidak terdaftar dalam sistem."
        });
    }

    // 4. Skenario ALLOW: Device ID valid & terdaftar
    logActivity({
        subject: user.username,
        endpoint,
        deviceId,
        actionResult: 'ALLOW',
        reason: 'DEVICE_VERIFIED'
    });

    // Sematkan data user dan deviceId ke objek request
    req.user = user;
    req.deviceId = deviceId;

    next();
};

module.exports = {
    verifyDevice
};