const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const { listLicenses, createLicense, updateLicense, deleteLicense } = require('../lib/licenses');

router.use(adminAuth);

router.get('/', (req, res) => {
    res.json({ licenses: listLicenses() });
});

router.post('/', (req, res) => {
    const { client_name, plan, expires_at, lock_domain } = req.body || {};
    const lic = createLicense({ client_name, plan, expires_at, lock_domain });
    res.status(201).json({ license: lic });
});

router.patch('/:key', (req, res) => {
    const patch = {};
    const allowed = ['client_name', 'plan', 'status', 'expires_at', 'lock_domain'];
    allowed.forEach((f) => {
        if (f in req.body) patch[f] = req.body[f];
    });
    if (req.body.reset_domain) patch.bound_domain = '';

    const lic = updateLicense(req.params.key, patch);
    if (!lic) return res.status(404).json({ error: 'not_found' });
    res.json({ license: lic });
});

router.delete('/:key', (req, res) => {
    const ok = deleteLicense(req.params.key);
    if (!ok) return res.status(404).json({ error: 'not_found' });
    res.status(204).end();
});

module.exports = router;
