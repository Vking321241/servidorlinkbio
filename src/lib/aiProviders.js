// Adaptador único para os provedores de IA suportados. Todos recebem
// { apiKey, model, system, user } e devolvem o texto da resposta.
// Groq expõe uma API compatível com a da OpenAI — muda só a URL base.

async function callOpenAiCompatible(baseUrl, { apiKey, model, system, user }) {
    const resp = await fetch(baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + apiKey,
        },
        body: JSON.stringify({
            model,
            max_tokens: 400,
            messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
            ],
        }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body.slice(0, 300)}`);
    }
    const data = await resp.json();
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) throw new Error('resposta vazia do provedor');
    return text;
}

async function callGemini({ apiKey, model, system, user }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: user }] }],
            generationConfig: { maxOutputTokens: 400 },
        }),
    });
    if (!resp.ok) {
        const body = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${body.slice(0, 300)}`);
    }
    const data = await resp.json();
    const cand = data.candidates && data.candidates[0];
    const text = cand && cand.content && cand.content.parts && cand.content.parts[0] && cand.content.parts[0].text;
    if (!text) throw new Error('resposta vazia do provedor');
    return text;
}

async function chatCompletion(provider, opts) {
    switch (provider) {
        case 'openai':
            return callOpenAiCompatible('https://api.openai.com/v1', opts);
        case 'groq':
            return callOpenAiCompatible('https://api.groq.com/openai/v1', opts);
        case 'gemini':
            return callGemini(opts);
        default:
            throw new Error('provedor desconhecido: ' + provider);
    }
}

module.exports = { chatCompletion };
