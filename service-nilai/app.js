const express = require('express');
const db = require('./config/db');
const config = require('./config/env');
const { verifyGatewaySecret, verifyToken } = require('./middlewares/auth');
const nilaiRoutes = require('./routes/nilai');

const app = express();

// Middleware parsing JSON body
app.use(express.json());

// Logging middleware untuk debugging
app.use((req, res, next) => {
    console.log(`[SERVICE NILAI] ${req.method} ${req.originalUrl}`);
    next();
});

// Health check (tanpa autentikasi untuk debugging)
app.get('/health', (req, res) => {
    res.json({
        status: "ONLINE",
        service: "Service Nilai",
        version: "1.0.0",
        timestamp: new Date().toISOString()
    });
});

// Semua endpoint wajib verifikasi gateway secret dan token
app.use('/nilai', verifyGatewaySecret, verifyToken, nilaiRoutes);

app.listen(config.PORT, () => {
    console.log(`[SERVICE NILAI] Running on port ${config.PORT}`);
});
