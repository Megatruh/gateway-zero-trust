const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Menerbitkan Access Token untuk User (10 Menit)
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
        { expiresIn: '10m' }
    );
};

/**
 * Menerbitkan Refresh Token (1 Hari)
 */
const generateRefreshToken = (user, deviceId) => {
    return jwt.sign(
        {
            sub: user.id,
            deviceId: deviceId
        },
        config.JWT_SECRET,
        { expiresIn: '1d' }
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