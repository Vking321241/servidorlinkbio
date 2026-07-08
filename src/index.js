require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const licenseRoutes = require('./routes/license');
const adminLoginRoutes = require('./routes/adminLogin');
const adminLicenseRoutes = require('./routes/adminLicenses');
const aiChatRoutes = require('./routes/aiChat');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '150kb' }));

// Limite global simples contra abuso; os endpoints públicos ainda têm suas
// próprias regras (licença válida, rate limit por chave, etc).
app.use(
    rateLimit({
        windowMs: 60 * 1000,
        max: 120,
        standardHeaders: true,
        legacyHeaders: false,
    })
);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/license', licenseRoutes);
app.use('/api/admin/login', adminLoginRoutes);
app.use('/api/admin/licenses', adminLicenseRoutes);
app.use('/api/ai-chat', aiChatRoutes);

app.use('/admin', express.static(path.join(__dirname, '..', 'public', 'admin')));

app.use((req, res) => {
    res.status(404).json({ error: 'not_found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[mxt-license-server] erro não tratado:', err);
    res.status(500).json({ error: 'internal_error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`mxt-license-server ouvindo na porta ${PORT}`);
});
