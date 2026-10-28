const express = require('express');
const router = express.Router();
const { getTranskripByNim } = require('../services/transkripService');
const { verifyServiceToken } = require('../middlewares/serviceAuth');
const { logActivity } = require('../services/auditLogger');

// GET /transkrip - Ambil Transkrip Mahasiswa (Protected S2S + RBAC)
router.get('/', verifyServiceToken, (req, res) => {
    try {
        let nimTarget = req.user.nim_or_nip;

        // Jika Admin/Dosen, bisa melihat transkrip mahasiswa via query parameter ?nim=...
        if ((req.user.role === 'admin' || req.user.role === 'dosen') && req.query.nim) {
            nimTarget = req.query.nim;
        }

        const transkripData = getTranskripByNim(nimTarget);

        logActivity({
            subject: req.user.username,
            endpoint: '/transkrip',
            deviceId: req.deviceId,
            actionResult: 'ALLOW',
            reason: `GET_TRANSKRIP_SUCCESS_${req.user.role.toUpperCase()}`
        });

        res.json({
            status: "ALLOW",
            message: "Berhasil mengambil data transkrip akademik.",
            targetNim: nimTarget,
            data: transkripData
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
});

module.exports = router;