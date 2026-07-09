# mxt-license-server

Servidor de licenciamento e assistente de IA que atende o plugin **Extend LP —
Link Bio (Single Page)**. É um projeto separado do plugin: roda na sua VPS
(via Docker/EasyPanel), e o plugin (rodando no site de cada cliente) fala com
ele por HTTP.

## O que ele faz

- `POST /api/license/verify` — o plugin chama isso (server-to-server, via
  `wp_remote_post`) para saber se a chave de licença configurada no site do
  cliente está ativa.
- `POST /api/ai-chat` — o plugin repassa a pergunta do visitante da bio page
  pra cá; este servidor valida a licença, chama o provedor de IA configurado
  e devolve a resposta + os cartões/links mais relevantes.
- `POST /api/admin/login` — login do painel (usuário + senha via env vars).
- `/admin` — painel para você criar, suspender e excluir licenças e
  **configurar o provedor de IA** (protegido por login e senha).

## Provedores de IA suportados

O provedor, o modelo e a chave de API são configurados **pela interface do
painel `/admin`** (card "Inteligência Artificial") — nada de variável de
ambiente para isso. Suportados:

| Provedor | Modelo padrão |
|---|---|
| Google Gemini | `gemini-2.0-flash` |
| OpenAI | `gpt-4o-mini` |
| Groq | `llama-3.3-70b-versatile` |

A chave fica guardada só no servidor (arquivo `data/licenses.json`, no volume
persistente) — nunca no plugin nem no site do cliente. Use o botão **Testar
conexão** no painel para validar chave + modelo antes de usar.

## Rodando localmente

```bash
npm install
cp .env.example .env
# edite o .env: defina ADMIN_USER e ADMIN_PASSWORD
npm run dev
```

Acesse `http://localhost:3000/admin`, entre com o usuário e a senha definidos
no `.env`, configure o provedor de IA e crie sua primeira licença.

## Deploy em Docker / EasyPanel

1. Suba esta pasta (`mxt-license-server/`) para um repositório Git próprio
   (não misture com o repositório do plugin).
2. No EasyPanel, crie um novo serviço do tipo **App** apontando para esse
   repositório (ele detecta o `Dockerfile` automaticamente).
3. Configure as variáveis de ambiente do serviço:
   - `ADMIN_USER` — usuário de login do painel `/admin`
   - `ADMIN_PASSWORD` — senha do painel (use uma senha forte; trocá-la derruba
     todas as sessões abertas)
   - `AI_RATE_LIMIT_PER_HOUR` — opcional, padrão `30`

   A chave do provedor de IA NÃO vai em variável de ambiente — configure pelo
   painel `/admin` depois do deploy.
4. Monte um **volume persistente** em `/app/data` (é onde fica o arquivo
   `licenses.json` com as licenças cadastradas — sem isso, um redeploy apaga
   tudo).
5. Exponha a porta `3000` com um domínio/subdomínio próprio, com HTTPS (ex:
   `https://ia.suaagencia.com.br`).

Se preferir Docker Compose puro na VPS (sem EasyPanel):

```bash
cp .env.example .env
# edite o .env
docker compose up -d --build
```

## Configurando o plugin

No painel do plugin, aba **IA & Licença**:

1. **URL do Servidor de IA**: a URL pública deste servidor, ex.
   `https://ia.suaagencia.com.br` (sem barra no final).
2. **Chave de Licença**: uma das chaves geradas no painel `/admin` deste
   servidor.
3. Clique em **Verificar Licença** — deve aparecer "Licença ativa".
4. Ative o assistente de IA e salve.

## Sobre "travar no domínio"

Ao criar uma licença, marcar **"Travar no primeiro domínio que verificar"**
faz a licença se vincular automaticamente ao primeiro site que verificá-la
com sucesso — chamadas de outro domínio com a mesma chave passam a ser
recusadas (`domain_mismatch`). Use o botão **Resetar domínio** no painel se
precisar mover a licença para outro site (ex: trocou de domínio do cliente).

## Estrutura

```
src/
  index.js              # servidor Express
  db.js                 # persistência em arquivo JSON (data/licenses.json)
  lib/licenses.js        # regras de licença (criar, verificar, travar domínio)
  lib/settings.js        # configurações de IA (provedor, modelo, chave)
  lib/aiProviders.js     # adaptador Gemini / OpenAI / Groq
  middleware/adminAuth.js # login/sessão do painel (ADMIN_USER + ADMIN_PASSWORD)
  routes/license.js      # POST /api/license/verify (público)
  routes/adminLogin.js   # POST /api/admin/login (usuário + senha → token de sessão)
  routes/adminLicenses.js # CRUD de licenças (protegido por sessão)
  routes/adminSettings.js # config de IA + teste de conexão (protegido por sessão)
  routes/aiChat.js       # POST /api/ai-chat (público, exige licença válida)
public/admin/index.html  # painel: config de IA + administração de licenças
```
