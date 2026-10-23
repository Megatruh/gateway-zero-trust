const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json()); // melakukan parsing json

app.get('/', (req, res) => {
    res.json({
        message:"API Gateway Zero Trust Berjalan !"
    });
});

app.listen(PORT, () => {
    console.log(`Gateway menyala di http://localhost:${PORT}`);
})