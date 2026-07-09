const { readDb, writeDb } = require('../db');

const PROVIDERS = ['gemini', 'openai', 'groq'];

const DEFAULT_MODELS = {
    gemini: 'gemini-2.0-flash',
    openai: 'gpt-4o-mini',
    groq: 'llama-3.3-70b-versatile',
};

function defaultSettings() {
    const providers = {};
    PROVIDERS.forEach((p) => {
        providers[p] = { api_key: '', model: DEFAULT_MODELS[p] };
    });
    return { ai_provider: 'gemini', providers };
}

function getSettings() {
    const db = readDb();
    const def = defaultSettings();
    const stored = db.settings && typeof db.settings === 'object' ? db.settings : {};
    const out = { ...def, ...stored, providers: { ...def.providers } };
    PROVIDERS.forEach((p) => {
        if (stored.providers && stored.providers[p]) {
            out.providers[p] = { ...def.providers[p], ...stored.providers[p] };
        }
    });
    if (!PROVIDERS.includes(out.ai_provider)) out.ai_provider = def.ai_provider;
    return out;
}

// Mescla só o que veio no patch; api_key vazia é ignorada para o front poder
// reenviar o form sem apagar uma chave já salva.
function updateSettings(patch) {
    const current = getSettings();
    if (patch.ai_provider && PROVIDERS.includes(patch.ai_provider)) {
        current.ai_provider = patch.ai_provider;
    }
    if (patch.providers && typeof patch.providers === 'object') {
        PROVIDERS.forEach((p) => {
            const upd = patch.providers[p];
            if (!upd || typeof upd !== 'object') return;
            if (typeof upd.model === 'string' && upd.model.trim() !== '') {
                current.providers[p].model = upd.model.trim();
            }
            if (typeof upd.api_key === 'string' && upd.api_key.trim() !== '') {
                current.providers[p].api_key = upd.api_key.trim();
            }
        });
    }
    const db = readDb();
    db.settings = current;
    writeDb(db);
    return current;
}

// Versão segura para devolver ao front: nunca expõe a chave inteira.
function publicSettings() {
    const s = getSettings();
    const providers = {};
    PROVIDERS.forEach((p) => {
        const key = s.providers[p].api_key;
        providers[p] = {
            model: s.providers[p].model,
            has_key: key !== '',
            key_hint: key !== '' ? '••••' + key.slice(-4) : '',
        };
    });
    return { ai_provider: s.ai_provider, providers };
}

module.exports = { PROVIDERS, DEFAULT_MODELS, getSettings, updateSettings, publicSettings };
