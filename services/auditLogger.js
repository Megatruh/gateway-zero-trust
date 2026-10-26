const db = require('../config/db');

const logActivity = ({subject = 'ANONYMOUS', endpoint, deviceId = null, actionResult, reason = ''}) => {
    try{
        const stmt = db. prepare(`
            INSERT INTO audit_logs (subject, endpoint, device_id, action_result, reason) VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(subject, endpoint, deviceId, actionResult, reason);
    } catch (error){
        console.log('[AUDIT LOG ERROR] Gagal mencatat log', error.message);
    }
};

module.exports = {
    logActivity
};