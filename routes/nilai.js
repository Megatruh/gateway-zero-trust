const express = require('express');
const router = express.Router();
const { getNilai, updateNilai, finalizeNilai } = require('../services/nilaiService');
const { logActivity } = require('../services/auditLogger');

// GET /nilai - Ambil data nilai terproteksi RBAC
router.get('/', (req, res) => {
    try {
        const data = getNilai(req.user);
        
        logActivity({
            subject: req.user.username,
            endpoint: '/nilai',
            deviceId: req.deviceId,
            actionResult: 'ALLOW',
            reason: `GET_NILAI_SUCCESS_${req.user.role.toUpperCase()}`
        });

        res.json({
            status: "ALLOW",
            message: "Berhasil mengambil data nilai.",
            role: req.user.role,
            data
        });
    } catch (error) {
        res.status(500).json({ status: "ERROR", message: error.message });
    }
});

// PUT /nilai/:id - Update Nilai (Dosen/Admin + Jam Kerja)
router.put('/:id', (req, res) => {
    const { nilaiAngka } = req.body;
    const nilaiId = req.params.id;

    if (nilaiAngka === undefined) {
        return res.status(400).json({
            status: "DENY",
            code: "MISSING_INPUT",
            reason: "Field nilaiAngka wajib diisi."
        });
    }

    const result = updateNilai(nilaiId, nilaiAngka, req.user);

    if (!result.success) {
        logActivity({
            subject: req.user.username,
            endpoint: `/nilai/${nilaiId}`,
            deviceId: req.deviceId,
            actionResult: 'DENY',
            reason: result.code
        });

        const statusCode = result.code === 'OUT_OF_HOURS' ? 403 : (result.code === 'FORBIDDEN' ? 403 : 400);
        return res.status(statusCode).json({
            status: "DENY",
            code: result.code,
            reason: result.message
        });
    }

    logActivity({
        subject: req.user.username,
        endpoint: `/nilai/${nilaiId}`,
        deviceId: req.deviceId,
        actionResult: 'ALLOW',
        reason: 'UPDATE_NILAI_SUCCESS'
    });

    res.json({
        status: "ALLOW",
        message: result.message
    });
});

// POST /nilai/finalize/:id - Finalisasi & Kunci Nilai
router.post('/finalize/:id', (req, res) => {
    const nilaiId = req.params.id;

    const result = finalizeNilai(nilaiId, req.user);

    if (!result.success) {
        logActivity({
            subject: req.user.username,
            endpoint: `/nilai/finalize/${nilaiId}`,
            deviceId: req.deviceId,
            actionResult: 'DENY',
            reason: result.code
        });

        const statusCode = result.code === 'OUT_OF_HOURS' ? 403 : (result.code === 'FORBIDDEN' ? 403 : 400);
        return res.status(statusCode).json({
            status: "DENY",
            code: result.code,
            reason: result.message
        });
    }

    logActivity({
        subject: req.user.username,
        endpoint: `/nilai/finalize/${nilaiId}`,
        deviceId: req.deviceId,
        actionResult: 'ALLOW',
        reason: 'FINALIZE_NILAI_SUCCESS'
    });

    res.json({
        status: "ALLOW",
        message: result.message
    });
});

module.exports = router;