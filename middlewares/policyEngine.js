const db = require('../config/db');

// Middleware untuk memverifikasi apakah X-Device-ID terdaftar di database
const verifyDevice = (req, res, next) => {
    const deviceId = req.headers['x-device-id'];

    if (!deviceId) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_DEVICE_ID",
            reason: "Header X-Device-ID wajib disertakan untuk setiap request user."
        });
    }

    // Cari user berdasarkan device_id di database
    const user = db.prepare('SELECT id, username, role, nim_or_nip FROM para_pengguna WHERE device_id = ?').get(deviceId);

    if (!user) {
        return res.status(403).json({
            status: "DENY",
            code: "UNREGISTERED_DEVICE",
            reason: "Device ID tidak terdaftar dalam sistem."
        });
    }

    // Sematkan data user dan deviceId ke objek request untuk middleware berikutnya
    req.user = user;
    req.deviceId = deviceId;

    next();
};

module.exports = {
    verifyDevice
};