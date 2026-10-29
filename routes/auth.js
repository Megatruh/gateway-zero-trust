const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const config = require('../config/env');
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken
} = require('../services/jwtService');
const { logActivity } = require('../services/auditLogger');

/**
 * POST /auth/login
 * Validasi Kredensial + Device Verification -> Issue JWT
 */
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originalUrl || '/auth/login';

    // 1. Validasi input dasar
    if (!username || !password) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_CREDENTIALS",
            reason: "Username dan password wajib diisi."
        });
    }

    if (!deviceId) {
        logActivity({
            subject: username || 'ANONYMOUS',
            endpoint,
            deviceId: null,
            actionResult: 'DENY',
            reason: 'LOGIN_MISSING_DEVICE_ID'
        });

        return res.status(400).json({
            status: "DENY",
            code: "MISSING_DEVICE_ID",
            reason: "Header X-Device-ID wajib disertakan saat login."
        });
    }

    // 2. Cari user di database
    const user = db.prepare('SELECT * FROM para_pengguna WHERE username = ?').get(username);

    // Verifikasi password terenkripsi via bcrypt
    if (!user || !bcrypt.compareSync(password, user.password)) {
        logActivity({
            subject: username,
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'INVALID_CREDENTIALS'
        });

        return res.status(401).json({
            status: "DENY",
            code: "INVALID_CREDENTIALS",
            reason: "Username atau password salah."
        });
    }

    // 3. Zero Trust Strict Check: Device ID matching
    if (user.device_id !== deviceId) {
        logActivity({
            subject: username,
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'UNAUTHORIZED_DEVICE_FOR_USER'
        });

        return res.status(403).json({
            status: "DENY",
            code: "DEVICE_MISMATCH",
            reason: "Akun ini tidak diizinkan diakses dari perangkat ini."
        });
    }

    // 4. Terbitkan Token JWT
    const accessToken = generateAccessToken(user, deviceId);
    const refreshToken = generateRefreshToken(user, deviceId);

    logActivity({
        subject: username,
        endpoint,
        deviceId,
        actionResult: 'ALLOW',
        reason: 'LOGIN_SUCCESS'
    });

    return res.json({
        status: "ALLOW",
        message: "Login berhasil.",
        data: {
            user: {
                id: user.id,
                nama: user.nama,
                username: user.username,
                role: user.role,
                nim_or_nip: user.nim_or_nip
            },
            accessToken,
            refreshToken
        }
    });
});

router.post('/refresh', (req, res) => {
    const { refreshToken } = req.body;
    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originalUrl || '/auth/refresh';

    if (!refreshToken) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_REFRESH_TOKEN",
            reason: "Refresh token wajib disertakan."
        });
    }

    if (!deviceId) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_DEVICE_ID",
            reason: "Header X-Device-ID wajib disertakan."
        });
    }

    // Verifikasi Refresh Token
    const decoded = verifyToken(refreshToken);

    if (!decoded) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'INVALID_REFRESH_TOKEN'
        });

        return res.status(403).json({
            status: "DENY",
            code: "INVALID_TOKEN",
            reason: "Refresh token tidak valid atau sudah expired."
        });
    }

    // Zero Trust Check: Device ID matching saat refresh
    if (decoded.deviceId !== deviceId) {
        logActivity({
            subject: 'REFRESH_ATTEMPT',
            endpoint,
            deviceId,
            actionResult: 'DENY',
            reason: 'REFRESH_DEVICE_MISMATCH'
        });

        return res.status(403).json({
            status: "DENY",
            code: "DEVICE_MISMATCH",
            reason: "Refresh token ini tidak valid untuk perangkat ini."
        });
    }

    // Ambil data user terbaru
    const user = db.prepare('SELECT * FROM para_pengguna WHERE id = ?').get(decoded.sub);

    if (!user) {
        return res.status(404).json({
            status: "DENY",
            code: "USER_NOT_FOUND",
            reason: "Pengguna tidak ditemukan."
        });
    }

    // Terbitkan Access Token baru
    const newAccessToken = generateAccessToken(user, deviceId);

    logActivity({
        subject: user.username,
        endpoint,
        deviceId,
        actionResult: 'ALLOW',
        reason: 'TOKEN_REFRESH_SUCCESS'
    });

    return res.json({
        status: "ALLOW",
        message: "Access token berhasil diperbarui.",
        data: {
            accessToken: newAccessToken
        }
    });
});

/**
 * POST /auth/service
 * Menerbitkan token service (5 menit, role: service)
 * Digunakan oleh Service Nilai untuk memanggil Service Transkrip
 */
router.post('/service', (req, res) => {
    const { client_id, client_secret } = req.body;
    const endpoint = req.originalUrl || '/auth/service';

    if (!client_id || !client_secret) {
        logActivity({
            subject: 'SERVICE_AUTH',
            endpoint,
            deviceId: 'INTERNAL',
            actionResult: 'DENY',
            reason: 'MISSING_SERVICE_CREDENTIALS'
        });

        return res.status(400).json({
            status: "DENY",
            code: "MISSING_CREDENTIALS",
            reason: "Client ID dan Client Secret wajib disertakan."
        });
    }

    // Verifikasi client credentials
    if (client_id !== config.SERVICE_CLIENT_ID || client_secret !== config.SERVICE_CLIENT_SECRET) {
        logActivity({
            subject: 'SERVICE_AUTH',
            endpoint,
            deviceId: 'INTERNAL',
            actionResult: 'DENY',
            reason: 'INVALID_SERVICE_CREDENTIALS'
        });

        return res.status(401).json({
            status: "DENY",
            code: "INVALID_CREDENTIALS",
            reason: "Client ID atau Client Secret tidak valid."
        });
    }

    // Terbitkan token service (5 menit)
    const serviceToken = jwt.sign(
        { sub: 'service-nilai', role: 'service' },
        config.JWT_SECRET,
        { expiresIn: '5m' }
    );

    logActivity({
        subject: 'SERVICE_AUTH',
        endpoint,
        deviceId: 'INTERNAL',
        actionResult: 'ALLOW',
        reason: 'SERVICE_TOKEN_ISSUED'
    });

    return res.json({
        status: "ALLOW",
        token: serviceToken
    });
});

/**
 * POST /auth/logout
 * Mencabut refresh token dari database
 */
router.post('/logout', (req, res) => {
    const { refreshToken } = req.body;
    const deviceId = req.headers['x-device-id'];
    const endpoint = req.originalUrl || '/auth/logout';

    if (!refreshToken) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_REFRESH_TOKEN",
            reason: "Refresh token wajib disertakan."
        });
    }

    // Verifikasi refresh token
    const decoded = verifyToken(refreshToken);

    if (!decoded) {
        logActivity({
            subject: 'ANONYMOUS',
            endpoint,
            deviceId: deviceId || null,
            actionResult: 'DENY',
            reason: 'INVALID_REFRESH_TOKEN'
        });

        return res.status(403).json({
            status: "DENY",
            code: "INVALID_TOKEN",
            reason: "Refresh token tidak valid atau sudah expired."
        });
    }

    // Cabut refresh token dengan menghapusnya dari database
    const result = db.prepare('UPDATE para_pengguna SET refresh_token = NULL WHERE id = ?').run(decoded.sub);

    if (result.changes === 0) {
        return res.status(404).json({
            status: "DENY",
            code: "USER_NOT_FOUND",
            reason: "Pengguna tidak ditemukan."
        });
    }

    logActivity({
        subject: decoded.sub || 'UNKNOWN',
        endpoint,
        deviceId: deviceId || null,
        actionResult: 'ALLOW',
        reason: 'LOGOUT_SUCCESS'
    });

    return res.json({
        status: "ALLOW",
        message: "Logout berhasil. Refresh token telah dicabut."
    });
});

module.exports = router;