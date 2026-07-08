const crypto = require('crypto');

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function adminAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/i, '');
    if (!process.env.ADMIN_TOKEN || !token || !safeEqual(token, process.env.ADMIN_TOKEN)) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
};
