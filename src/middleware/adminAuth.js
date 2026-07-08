const crypto = require('crypto');

function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

// O segredo de assinatura deriva da senha: trocar ADMIN_PASSWORD invalida
// todas as sessões abertas, sem precisar de estado no servidor.
function secret() {
    return crypto
        .createHash('sha256')
        .update('mxt-session:' + String(process.env.ADMIN_PASSWORD || ''))
        .digest();
}

function sign(exp) {
    return crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex');
}

function issueToken(hours = 12) {
    const exp = Date.now() + hours * 3600 * 1000;
    return exp + '.' + sign(exp);
}

function verifyToken(token) {
    const parts = String(token || '').split('.');
    if (parts.length !== 2) return false;
    const exp = parseInt(parts[0], 10);
    if (!exp || Date.now() > exp) return false;
    return safeEqual(parts[1], sign(exp));
}

function checkCredentials(username, password) {
    const user = process.env.ADMIN_USER || '';
    const pass = process.env.ADMIN_PASSWORD || '';
    if (!user || !pass) return false;
    // Avalia os dois sempre, para não vazar qual campo errou via timing.
    const userOk = safeEqual(String(username || ''), user);
    const passOk = safeEqual(String(password || ''), pass);
    return userOk && passOk;
}

function adminAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/i, '');
    if (!verifyToken(token)) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    next();
}

module.exports = { adminAuth, issueToken, checkCredentials };
