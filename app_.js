const express = require('express');
const config = require('./config/env');
const { verifyDevice } = require('./middlewares/policyEngine');
const { authenticateToken } = require('./middlewares/auth');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.json());

// Health Check Route
app.get('/', (req, res) => {
    res.json({ status: "ONLINE", service: "Zero Trust API Gateway" });
});

// Auth Routes (Login)
app.use('/auth', authRoutes);

// Protected Route (Layer 1: Device Check, Layer 2: JWT Bearer Token Check)
app.get('/nilai', verifyDevice, authenticateToken, (req, res) => {
    res.json({
        status: "ALLOW",
        message: "Berhasil mengakses data nilai terproteksi.",
        user: req.user
    });
});

app.listen(config.PORT, () => {
    console.log(`[GATEWAY] Server running on port ${config.PORT}`);
});