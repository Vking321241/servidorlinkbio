const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { checkCredentials, issueToken } = require('../middleware/adminAuth');

// Limite dedicado (mais apertado que o global) contra força bruta de senha.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'too_many_attempts' },
});

router.post('/', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};
    if (!checkCredentials(username, password)) {
        return res.status(401).json({ error: 'invalid_credentials' });
    }
    res.json({ token: issueToken(12), expires_in_hours: 12 });
});

module.exports = router;
