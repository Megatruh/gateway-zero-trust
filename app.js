const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('./config/env');
const { verifyDevice } = require('./middlewares/policyEngine');
const { authenticateToken } = require('./middlewares/auth');
const authRoutes = require('./routes/auth');

const app = express();

// Middleware parsing JSON body
app.use(express.json());

// Logging middleware untuk debugging
app.use((req, res, next) => {
    console.log(`[GATEWAY] ${req.method} ${req.originalUrl}`);
    next();
});

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

// 3. Proxy ke Service Nilai (port 3001)
app.use('/nilai', verifyDevice, authenticateToken, createProxyMiddleware({
    target: `http://localhost:${config.SERVICE_NILAI_PORT}/nilai`, // Add /nilai to target
    changeOrigin: true,
    pathRewrite: { '^/nilai': '' }, // Remove /nilai from request path
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY PROXY] onProxyReq called for ${req.method} ${req.originalUrl}`);
        console.log(`[GATEWAY PROXY] Setting X-Gateway-Secret: ${config.GATEWAY_SECRET.substring(0, 10)}...`);
        // Tambahkan header X-Gateway-Secret
        proxyReq.setHeader('X-Gateway-Secret', config.GATEWAY_SECRET);
        // Forward Authorization header
        if (req.headers['authorization']) {
            proxyReq.setHeader('Authorization', req.headers['authorization']);
        }
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`[GATEWAY PROXY] Response from service: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
        console.error('[GATEWAY PROXY ERROR]', err);
        res.status(500).json({ status: "ERROR", message: "Proxy error", error: err.message });
    }
}));

// 4. Proxy ke Service Transkrip (port 3002)
app.use('/transkrip', verifyDevice, authenticateToken, createProxyMiddleware({
    target: `http://localhost:${config.SERVICE_TRANSKRIP_PORT}/transkrip`, // Add /transkrip to target
    changeOrigin: true,
    pathRewrite: { '^/transkrip': '' }, // Remove /transkrip from request path
    onProxyReq: (proxyReq, req, res) => {
        console.log(`[GATEWAY PROXY] Forwarding to service-transkrip: ${req.method} ${req.originalUrl} -> ${proxyReq.path}`);
        // Tambahkan header X-Gateway-Secret
        proxyReq.setHeader('X-Gateway-Secret', config.GATEWAY_SECRET);
        // Forward Authorization header
        if (req.headers['authorization']) {
            proxyReq.setHeader('Authorization', req.headers['authorization']);
        }
    },
    onError: (err, req, res) => {
        console.error('[GATEWAY PROXY ERROR]', err);
        res.status(500).json({ status: "ERROR", message: "Proxy error", error: err.message });
    }
}));

app.listen(config.PORT, () => {
    console.log(`[GATEWAY] Server running on port ${config.PORT}`);
});