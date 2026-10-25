const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Menerbitkan Access Token untuk User (15 Menit)
 */
const generateAccessToken = (user, deviceId) => {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role,
            nim_or_nip: user.nim_or_nip,
            deviceId: deviceId
        },
        config.JWT_SECRET,
        { expiresIn: '15m' }
    );
};

/**
 * Menerbitkan Refresh Token (7 Hari)
 */
const generateRefreshToken = (user, deviceId) => {
    return jwt.sign(
        {
            sub: user.id,
            deviceId: deviceId
        },
        config.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Menerbitkan Service Token untuk Komunikasi Internal Gateway -> Microservices (5 Menit)
 */
const generateServiceToken = (targetService) => {
    return jwt.sign(
        {
            iss: 'api-gateway',
            aud: targetService
        },
        config.GATEWAY_SECRET,
        { expiresIn: '5m' }
    );
};

/**
 * Verifikasi Access Token
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
        return null;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    generateServiceToken,
    verifyToken
};