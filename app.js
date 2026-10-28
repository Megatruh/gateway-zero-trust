const express = require('express');
const config = require('./config/env');
const { verifyDevice } = require('./middlewares/policyEngine');
const { authenticateToken } = require('./middlewares/auth');
const authRoutes = require('./routes/auth');
const nilaiRoutes = require('./routes/nilai');

const app = express();

// Middleware parsing JSON body
app.use(express.json());

// 1. Public - Tanpa Middleware Verifikasi Device
app.get('/', (req, res) => {
    res.json({
        status: "ONLINE",
        service: "Zero Trust API Gateway",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// 2. Public Auth Route (Login & Token Issuance)
app.use('/auth', authRoutes);

// 3. Protected Route (Wajib Verifikasi Device ID & JWT Token)
app.use('/nilai', verifyDevice, authenticateToken, nilaiRoutes);

app.listen(config.PORT, () => {
    console.log(`[GATEWAY] Server running on port ${config.PORT}`);
});