// middleware validasi header X-Device-ID
const verifyDevice = (req, res, next) => {
    const deviceID = req.headers['x-device-id'];

    if (!deviceID) {
        return res.status(400).json({
            status:"DENY",
            code:"MISSING_DEVICE_ID",
            reason:"Header X-Device-ID wajib disertakan untuk setiap request user."
        });
    }
    req.deviceID = deviceID;
    next();
}

module.exports = {
    verifyDevice
}