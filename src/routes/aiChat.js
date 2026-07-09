const express = require('express');
const router = express.Router();
const { verifyLicense } = require('../lib/licenses');
const { getSettings } = require('../lib/settings');
const { chatCompletion } = require('../lib/aiProviders');

// Rate limit simples por licença (em memória — reinicia com o processo).
const rlMap = new Map();
function checkRateLimit(key) {
    const limit = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '30', 10);
    const hour = 60 * 60 * 1000;
    const now = Date.now();
    const entry = rlMap.get(key);
    if (!entry || now > entry.resetAt) {
        rlMap.set(key, { count: 1, resetAt: now + hour });
        return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
}

function buildSystemPrompt(cards, briefing) {
    const cardList = cards
        .slice(0, 6)
        .map((c) => {
            const tags = c.palavras_chave ? ` (palavras-chave: ${c.palavras_chave})` : '';
            return `#${c.idx} — ${c.titulo || ''}: ${c.descricao || ''}${tags}`;
        })
        .join('\n');

    return [
        'Você é um assistente de atendimento em uma página de links (bio link).',
        'Responda de forma breve, direta e simpática, em português do Brasil, em no máximo 2 frases.',
        briefing ? `Contexto do negócio, fornecido pelo dono da página: ${briefing}` : '',
        'Cartões/links disponíveis nesta página:',
        cardList,
        'Sempre que fizer sentido, aponte de 1 a 3 cartões relevantes para a pergunta do visitante através de "card_indices".',
        'Responda SOMENTE em JSON estrito, sem texto fora dele, no formato: {"reply": "...", "card_indices": [numeros]}.',
    ]
        .filter(Boolean)
        .join('\n\n');
}

function parseModelReply(raw) {
    try {
        return JSON.parse(raw);
    } catch (e) {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {
                return null;
            }
        }
        return null;
    }
}

router.post('/', async (req, res) => {
    const { license_key, domain, message, cards, briefing } = req.body || {};

    if (!license_key || !domain) return res.status(400).json({ success: false, reason: 'bad_request' });

    const status = verifyLicense(license_key, domain);
    if (!status.valid) return res.status(403).json({ success: false, reason: status.reason });

    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, reason: 'empty' });
    }
    if (!Array.isArray(cards) || cards.length === 0) {
        return res.status(400).json({ success: false, reason: 'no_cards' });
    }
    if (!checkRateLimit(license_key)) {
        return res.status(429).json({ success: false, reason: 'rate_limit' });
    }

    const settings = getSettings();
    const provider = settings.ai_provider;
    const conf = settings.providers[provider];
    if (!conf || !conf.api_key) {
        return res.status(500).json({ success: false, reason: 'not_configured' });
    }

    const trimmedMessage = message.trim().slice(0, 300);
    const systemPrompt = buildSystemPrompt(cards, briefing);

    try {
        const raw = await chatCompletion(provider, {
            apiKey: conf.api_key,
            model: conf.model,
            system: systemPrompt,
            user: trimmedMessage,
        });

        const parsed = parseModelReply(raw);

        if (!parsed || !parsed.reply) {
            return res.json({
                success: true,
                reply: raw.trim().slice(0, 500) || 'Desculpe, não consegui responder agora.',
                card_indices: [],
            });
        }

        const validIdx = cards.map((c) => c.idx);
        const cardIndices = Array.isArray(parsed.card_indices)
            ? parsed.card_indices.map(Number).filter((n) => validIdx.includes(n)).slice(0, 3)
            : [];

        return res.json({ success: true, reply: String(parsed.reply).slice(0, 500), card_indices: cardIndices });
    } catch (err) {
        console.error(`[ai-chat] erro no provedor ${provider}:`, err.message);
        return res.status(502).json({ success: false, reason: 'api_error' });
    }
});

module.exports = router;
