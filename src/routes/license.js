const express = require('express');
const router = express.Router();
const { verifyLicense } = require('../lib/licenses');

// Chamado pelo plugin (server-to-server, via wp_remote_post) para saber se a
// licença configurada no site do cliente está ativa.
router.post('/verify', (req, res) => {
    const { license_key, domain } = req.body || {};
    const result = verifyLicense(license_key, domain);
    res.json(result);
});

module.exports = router;
