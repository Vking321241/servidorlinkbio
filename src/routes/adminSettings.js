const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const { publicSettings, updateSettings, getSettings } = require('../lib/settings');
const { chatCompletion } = require('../lib/aiProviders');

router.use(adminAuth);

router.get('/', (req, res) => {
    res.json({ settings: publicSettings() });
});

router.put('/', (req, res) => {
    updateSettings(req.body || {});
    res.json({ settings: publicSettings() });
});

// Dispara um prompt curto no provedor ativo para validar chave + modelo.
router.post('/test', async (req, res) => {
    const settings = getSettings();
    const provider = settings.ai_provider;
    const conf = settings.providers[provider];
    if (!conf || !conf.api_key) {
        return res.status(400).json({ ok: false, error: 'Chave de API não configurada para ' + provider + '.' });
    }
    try {
        const reply = await chatCompletion(provider, {
            apiKey: conf.api_key,
            model: conf.model,
            system: 'Responda em português do Brasil, em uma frase curta.',
            user: 'Diga apenas: conexão OK.',
        });
        res.json({ ok: true, provider, model: conf.model, reply: String(reply).slice(0, 200) });
    } catch (err) {
        res.status(502).json({ ok: false, error: err.message.slice(0, 300) });
    }
});

module.exports = router;
