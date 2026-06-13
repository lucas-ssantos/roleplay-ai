# OpenRP AI — Contexto para Claude

Plataforma local de roleplay/chat com IA usando Ollama. Inspirado em TalkieAI, LinkyAI, SillyTavern. Tudo roda localmente, sem login, sem nuvem.

## Stack

- **Runtime**: Node.js 20+ (ESM — `"type": "module"` no package.json)
- **Backend**: Express 4 (`src/services/webServer.js` — arquivo único com todas as rotas)
- **Banco**: SQLite via `sql.js` (banco em memória, persistido manualmente em disco via `saveDB()`)
- **IA**: Ollama local em `http://127.0.0.1:11434` (padrão: modelo `qwen3:8b`)
- **Frontend**: HTML/CSS/JS puro em `public/` — sem framework, sem bundler
- **IDs**: UUIDs v4 via `uuid`

## Estrutura de arquivos importante

```
src/
  index.js                          ← entry point (init + shutdown)
  core/
    shutdown.js                     ← graceful shutdown + registro de processos
  services/
    webServer.js                    ← TODAS as rotas Express (página + API)
    ollama.init.js                  ← inicia daemon Ollama (systemd ou fallback)
    database/
      db.js                         ← getDB() / saveDB()
      migrations.js                 ← CREATE TABLE IF NOT EXISTS
      queries.js                    ← todas as funções de acesso ao banco
      save.js                       ← salva o banco em disco

public/
  index.html                        ← lista de personagens (cards clicáveis → /chat/:id)
  new-character.html                ← formulário de criação → redireciona para /chat/:id
  chat.html                         ← página de chat imersivo (estilo TalkieAI)
  persona.html                      ← configuração da persona do usuário
  settings.html                     ← configurações de geração do modelo
  sidebar.html                      ← sidebar reutilizável (carregada via fetch)
  check.html                        ← checagem de saúde (Ollama + DB)
  viewdb.html                       ← visualização do banco de dados
  uploads/                          ← avatares enviados por upload

data/
  roleplay.db                       ← banco SQLite persistido (binário)

config_recomendadas/
  low_spec.json / medium_spec.json / high_spec.json   ← presets de config por hardware

contexto/                           ← documentação interna do projeto (referência)
```

## Banco de dados — tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `characters` | id, name, description, personality, avatar_url, scenario, first_message |
| `conversations` | id, character_id, user_persona, title |
| `messages` | id, conversation_id, role (user/assistant/system), content, position |
| `persona` | id='self', name, description, avatar_url (única linha) |
| `memories` | id, conversation_id, type (auto/manual/pinned), content, keywords, is_pinned |
| `lorebooks` | id, scope (global/character), character_id, title, content, keywords |
| `generation_config` | id='global', model, temperature, top_p, top_k, min_p, repeat_penalty, max_tokens, context_size, stream, seed, stop, num_ctx_messages |
| `character_config` | override por personagem (mesmos campos + system_prompt, jailbreak) |
| `conversation_config` | override por conversa |
| `token_usage` | estimativas de tokens por mensagem |

**Importante:** `sql.js` não persiste automaticamente — sempre chamar `saveDB()` após escrita.

## Rotas do webServer.js

### Páginas HTML
```
GET /                    → index.html (redireciona p/ /check ou /persona se necessário)
GET /check               → check.html
GET /persona             → persona.html
GET /settings            → settings.html
GET /character/new       → new-character.html
GET /chat/:characterId   → chat.html
GET /api/viewdb          → viewdb.html
```

### API de personagens
```
GET  /api/characters         → lista todos
GET  /api/characters/:id     → busca por ID
POST /api/characters         → cria (suporta avatar_upload em base64 ou avatar_link)
```

### API de conversas e chat
```
POST /api/conversations                       → cria conversa + insere first_message no banco
GET  /api/conversations/:id                   → dados da conversa
GET  /api/conversations/:id/messages          → histórico ordenado por position
POST /api/conversations/:id/messages          → envia mensagem → streaming SSE
```

### API de configuração / outros
```
GET  /api/status          → health check (Ollama + DB)
GET  /api/persona         → retorna persona atual
POST /api/persona         → salva persona
GET  /api/config          → config global de geração
POST /api/config          → salva config global
GET  /api/presets         → presets de hardware (low/medium/high)
GET  /api/viewdb/tables   → lista tabelas com contagem
GET  /api/viewdb/records?table=X → últimas 25 linhas de uma tabela
```

## Padrão do chat (streaming)

`POST /api/conversations/:id/messages` funciona assim:
1. Valida e busca conversa + personagem + persona
2. Mescla config: global → character_config (override se tiver `model` definido)
3. Monta system prompt: description → personality → scenario → persona do user
4. Busca últimas N mensagens (`getLastNMessages`) para contexto
5. Salva mensagem do usuário no banco (`addMessage`)
6. Chama `http://127.0.0.1:11434/api/chat` com `stream: true`
7. Responde com **SSE** (`Content-Type: text/event-stream`)
8. Cada chunk: `data: {"delta":"texto","done":false}`
9. Final: `data: {"delta":"","done":true,"message_id":"..."}`
10. Filtra `<think>...</think>` (reasoning tokens do qwen3) durante o stream
11. Salva resposta completa no banco ao final

## Padrão do frontend

- Páginas são **HTML estático** servidas pelo Express
- Sidebar é carregada via `fetch('/sidebar.html')` e injetada no `#sidebar-root`
- Link ativo na sidebar: compara `link.dataset.path` com `window.location.pathname`
- Formulários fazem `fetch` para a API e manipulam a resposta via JS
- **Sem framework**: DOM puro, `fetch`, eventos nativos
- Paleta: `#020617` (fundo), `#38bdf8` (azul principal), `#94a3b8` (texto secundário)
- Estilo: dark mode, glassmorphism (backdrop-filter), bordas `rgba(148,163,184,0.12)`

## Página chat.html — design

- Imagem do personagem como **background full-screen** (`background-size: cover`, `center top`)
- Overlay com gradiente escurecendo de cima para baixo
- No desktop (>900px): chat centralizado em 680px, overlay lateral deixa imagem visível à esquerda
- Balão personagem: esquerda, glassmorphism escuro, `border-radius: 0 1.25rem 1.25rem 1.25rem`
- Balão usuário: direita, azul `rgba(56,189,248,0.88)`, `border-radius: 1.25rem 1.25rem 0 1.25rem`
- Indicador de digitação: 3 pontos animados enquanto aguarda Ollama
- Streaming token-a-token: `reader.getReader()` + SSE parsing

## Fluxo de criação de personagem

1. `POST /api/characters` com avatar (base64 ou link) → salvo em `public/uploads/`
2. Resposta: `{ ok: true, id: "uuid" }`
3. Redirect para `/chat/:id`
4. Chat page faz `POST /api/conversations` → cria conversa + insere `first_message` como mensagem `assistant` position=0
5. Carrega mensagens e exibe

## Comandos

```bash
npm start        # produção
npm run dev      # watch mode (node --watch)
```

## Observações importantes

- **Persona é obrigatória** para acessar `/` — redireciona para `/persona` se não existir
- **Ollama é obrigatório** — redireciona para `/check` se não responder
- `first_message` suporta `{{user}}` que é substituído pelo nome da persona ao criar conversa
- Config de geração tem hierarquia: `global` → `character_config` → `conversation_config`
- O modelo padrão é `qwen3:8b` — pode ser alterado em `/settings`
- Avatar upload: enviado como base64 no body JSON, salvo em `public/uploads/` com nome `timestamp-filename`
- Todos os IDs são UUIDs v4
- `getLastNMessages` retorna ordenado por `created_at DESC LIMIT n` e depois reverte (mais antigo primeiro)
