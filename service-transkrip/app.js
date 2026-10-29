const express = require('express');
const db = require('./config/db');
const config = require('./config/env');
const { verifyGatewaySecret, verifyToken } = require('./middlewares/auth');
const transkripRoutes = require('./routes/transkrip');

const app = express();

// Middleware parsing JSON body
app.use(express.json());

// Logging middleware untuk debugging
app.use((req, res, next) => {
    console.log(`[SERVICE TRANSKRIP] ${req.method} ${req.originalUrl}`);
    next();
});

// Health check (tanpa autentikasi untuk debugging)
app.get('/health', (req, res) => {
    res.json({
        status: "ONLINE",
        service: "Service Transkrip",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// Semua endpoint wajib verifikasi gateway secret dan token
app.use('/transkrip', verifyGatewaySecret, verifyToken, transkripRoutes);

app.listen(config.PORT, () => {
    console.log(`[SERVICE TRANSKRIP] Running on port ${config.PORT}`);
});
