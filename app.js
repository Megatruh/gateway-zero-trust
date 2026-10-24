const express = require('express');
const config = require('./config/env');
const {verifyDevice} = require('./middlewares/policyEngine');

const app = express();

app.use(express.json()); // melakukan parsing json

app.use(verifyDevice);

// console.log(verifyDevice);

// routes
app.get('/', (req, res) => {
    res.json({
        status:"ALLOW",
        message:"API Gateway Zero Trust Berjalan !"
    });
});

app.get('/nilai', (req, res)=>{
    res.json({
        status:"ALLOW",
        message:"Data nilai (Simulais)"
    });
});

// menjalankan server
app.listen(config.PORT, () => {
    console.log(`[Gateway] menyala di http://localhost:${config.PORT}`);
})