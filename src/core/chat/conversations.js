import { Router } from "express";
import {
    getCharacter, getPersona,
    createConversation, getConversation, getConversationsForCharacter,
    addMessage, getConversationMessages, resetConversation,
} from "../../services/database/queries.js";
import { resolveConfig } from "./helpers.js";
import { extractAndSaveAutoMemories } from "../memory/index.js";

const router = Router();

// ── GET /api/characters/:id/conversations ────────────────────────────────────
// Lista as conversas de um personagem (cada uma com seu cenário e mensagem inicial).
router.get("/characters/:id/conversations", (req, res) => {
    try {
        const character = getCharacter(req.params.id);
        if (!character) return res.status(404).json({ ok: false, message: "Personagem não encontrado." });

        res.json({ ok: true, conversations: getConversationsForCharacter(req.params.id) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/conversations ───────────────────────────────────────────────────
// Cria uma nova conversa com cenário + mensagem inicial próprios.
router.post("/conversations", (req, res) => {
    try {
        const { character_id, title, scenario, first_message } = req.body;
        if (!character_id) return res.status(400).json({ ok: false, message: "character_id é obrigatório." });

        const character = getCharacter(character_id);
        if (!character) return res.status(404).json({ ok: false, message: "Personagem não encontrado." });

        const persona = getPersona();
        const convId  = createConversation(
            character_id,
            persona?.name || null,
            title?.trim() || `Chat com ${character.name}`,
            scenario?.trim() || null,
            first_message?.trim() || null
        );

        if (first_message?.trim()) {
            const userName = persona?.name || "você";
            addMessage(convId, "assistant", first_message.trim().replace(/\{\{user\}\}/gi, userName), 0);
        }

        res.json({ ok: true, id: convId });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/conversations/:id ────────────────────────────────────────────────
router.get("/conversations/:id", (req, res) => {
    try {
        const conv = getConversation(req.params.id);
        if (!conv) return res.status(404).json({ ok: false, message: "Conversa não encontrada." });
        res.json({ ok: true, conversation: conv });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── GET /api/conversations/:id/messages ──────────────────────────────────────
router.get("/conversations/:id/messages", (req, res) => {
    try {
        res.json({ ok: true, messages: getConversationMessages(req.params.id) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/conversations/:id/reset ────────────────────────────────────────
router.post("/conversations/:id/reset", (req, res) => {
    try {
        const conv = getConversation(req.params.id);
        if (!conv) return res.status(404).json({ ok: false, message: "Conversa não encontrada." });

        resetConversation(req.params.id);

        let firstMsg = null;
        if (conv.first_message) {
            const persona   = getPersona();
            const userName  = persona?.name || "você";
            const content   = conv.first_message.replace(/\{\{user\}\}/gi, userName);
            const msgId     = addMessage(req.params.id, "assistant", content, 0);
            firstMsg = { id: msgId, role: "assistant", content };
        }

        res.json({ ok: true, first_message: firstMsg });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── POST /api/conversations/:id/memories/generate ────────────────────────────
router.post("/conversations/:id/memories/generate", async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length < 2)
            return res.status(400).json({ ok: false, message: "Selecione ao menos 2 mensagens." });

        const conv = getConversation(req.params.id);
        if (!conv) return res.status(404).json({ ok: false, message: "Conversa não encontrada." });

        const character = getCharacter(conv.character_id);
        const persona   = getPersona();
        const config    = resolveConfig(conv.character_id);

        const created = await extractAndSaveAutoMemories(req.params.id, messages, character, persona, config);
        res.json({ ok: true, created: created.length });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

export default router;
