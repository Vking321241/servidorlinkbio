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
        .update('mxt-session:' + adminPassword())
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

// Painéis de env var (EasyPanel etc.) costumam deixar passar aspas e espaços
// junto do valor — "senha" vira literalmente "senha" com aspas. Normaliza.
function cleanEnv(val) {
    let v = String(val || '').trim();
    if (v.length >= 2 && ((v[0] === '"' && v[v.length - 1] === '"') || (v[0] === "'" && v[v.length - 1] === "'"))) {
        v = v.slice(1, -1).trim();
    }
    return v;
}

function adminUser() { return cleanEnv(process.env.ADMIN_USER); }
function adminPassword() { return cleanEnv(process.env.ADMIN_PASSWORD); }

function checkCredentials(username, password) {
    const user = adminUser();
    const pass = adminPassword();
    if (!user || !pass) {
        console.warn('[login] tentativa recusada: ADMIN_USER/ADMIN_PASSWORD não configurados no ambiente.');
        return false;
    }
    const givenUser = String(username || '').trim();
    const givenPass = String(password || '');
    // Avalia os dois sempre, para não vazar qual campo errou via timing.
    const userOk = safeEqual(givenUser, user);
    const passOk = safeEqual(givenPass, pass) || safeEqual(givenPass.trim(), pass);
    if (!userOk || !passOk) {
        // Diagnóstico no log do servidor (nunca imprime a senha em si).
        console.warn(
            `[login] tentativa recusada: usuário ${userOk ? 'OK' : `NÃO bateu (informado "${givenUser}", esperado "${user}")`}` +
            ` · senha ${passOk ? 'OK' : `NÃO bateu (informada com ${givenPass.length} caracteres, esperada com ${pass.length})`}`
        );
    }
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

module.exports = { adminAuth, issueToken, checkCredentials, adminUser, adminPassword };
