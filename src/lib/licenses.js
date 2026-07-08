const crypto = require('crypto');
const { readDb, writeDb } = require('../db');

// Sem caracteres ambíguos (0/O, 1/I) para facilitar digitação manual.
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateKey() {
    const bytes = crypto.randomBytes(16);
    let out = '';
    for (let i = 0; i < 16; i++) {
        out += KEY_CHARS[bytes[i] % KEY_CHARS.length];
        if ((i + 1) % 4 === 0 && i !== 15) out += '-';
    }
    return out;
}

function listLicenses() {
    return readDb().licenses;
}

function findLicense(key) {
    return readDb().licenses.find((l) => l.license_key === key) || null;
}

function createLicense({ client_name, plan, expires_at, lock_domain }) {
    const db = readDb();
    const now = new Date().toISOString();
    const lic = {
        license_key: generateKey(),
        client_name: client_name || '',
        plan: plan || 'basic',
        status: 'active',
        lock_domain: !!lock_domain,
        bound_domain: '',
        expires_at: expires_at || null,
        created_at: now,
        updated_at: now,
    };
    db.licenses.push(lic);
    writeDb(db);
    return lic;
}

function updateLicense(key, patch) {
    const db = readDb();
    const idx = db.licenses.findIndex((l) => l.license_key === key);
    if (idx < 0) return null;
    db.licenses[idx] = { ...db.licenses[idx], ...patch, updated_at: new Date().toISOString() };
    writeDb(db);
    return db.licenses[idx];
}

function deleteLicense(key) {
    const db = readDb();
    const before = db.licenses.length;
    db.licenses = db.licenses.filter((l) => l.license_key !== key);
    writeDb(db);
    return db.licenses.length < before;
}

// Regra de verificação usada tanto por /api/license/verify quanto por /api/ai-chat.
// Quando lock_domain está ativo, o primeiro domínio a verificar com sucesso
// "trava" a licença; chamadas de outro domínio depois disso são recusadas.
function verifyLicense(license_key, domain) {
    if (!license_key || !domain) return { valid: false, reason: 'invalid' };

    const lic = findLicense(license_key);
    if (!lic) return { valid: false, reason: 'invalid' };
    if (lic.status !== 'active') return { valid: false, reason: 'invalid' };
    if (lic.expires_at && new Date(lic.expires_at).getTime() < Date.now()) {
        return { valid: false, reason: 'invalid' };
    }

    if (lic.lock_domain) {
        if (!lic.bound_domain) {
            updateLicense(license_key, { bound_domain: domain });
        } else if (lic.bound_domain !== domain) {
            return { valid: false, reason: 'domain_mismatch' };
        }
    }

    return { valid: true, plan: lic.plan, expires_at: lic.expires_at || '' };
}

module.exports = {
    listLicenses,
    findLicense,
    createLicense,
    updateLicense,
    deleteLicense,
    verifyLicense,
};
