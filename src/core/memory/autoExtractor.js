import { appConfig } from "../../config.js";
import { getMemories, getPinnedMemories } from "../../services/database/queries.js";
import { createAutoMemory, createPinnedMemory } from "./create.js";

const OLLAMA_URL = appConfig.ollama.chatEndpoint;

const buildSystemPrompt = (characterName, personaName) => `\
You are a memory compression system for a roleplay chat application.
Analyze the conversation excerpt between ${personaName} (user) and ${characterName} (character).
Create compact memory entries capturing what HAPPENED — the episodic content of this exchange.

WHAT TO CAPTURE (is_critical: false — saved as auto memory, retrieved when keywords match):
- Facts revealed about the user: "The user works a night shift at a convenience store"
- Story developments: "They discussed starting a new chapter in their relationship"
- Emotional moments: "The user expressed loneliness and uncertainty about the future"
- Scene references: "They talked while walking near the old park downtown"
- Preferences or history mentioned: "The user mentioned they started a new part-time job"

MARK is_critical: true ONLY for facts that permanently change who the character IS or the relationship structure (saved as pinned memory, always included in context):
- The character undergoes a permanent physical or identity change
- The relationship fundamentally shifts (enemy → ally, stranger → close friend)
- A secret is revealed that cannot be un-revealed and redefines the dynamic
- The user reveals something that structurally changes how the character must treat them

DO NOT mark is_critical: true for:
- Emotional reactions that pass ("got angry", "felt nervous")
- Preferences or hobbies ("likes coffee")
- Temporary states ("currently tired", "just arrived home")

Respond ONLY with valid JSON — no markdown, no explanation:
{"memories": [{"content": "...", "keywords": "kw1, kw2, kw3", "summary": "short label or null", "is_critical": false}]}

If nothing notable happened in this excerpt, respond with exactly: {"memories": []}`;

function isTooSimilar(existingList, candidate) {
    const words = new Set(candidate.toLowerCase().split(/\s+/).filter(w => w.length >= 4));
    if (words.size === 0) return false;
    return existingList.some(m => {
        const existing = new Set((m.content || '').toLowerCase().split(/\s+/).filter(w => w.length >= 4));
        return [...words].filter(w => existing.has(w)).length / words.size > 0.55;
    });
}

/**
 * Analisa as mensagens recentes e cria memórias `auto` resumindo o que aconteceu.
 * Memórias de extrema importância são escaladas para `pinned` automaticamente.
 * Fire-and-forget — não bloqueia o streaming.
 *
 * @param {string}   conversationId
 * @param {object[]} recentMessages  - últimas mensagens (role !== 'system')
 * @param {object}   character       - { name, ... }
 * @param {object}   persona         - { name, ... }
 * @param {object}   modelConfig     - { model, ... }
 * @returns {Promise<string[]>}      - IDs das memórias criadas
 */
export async function extractAndSaveAutoMemories(conversationId, recentMessages, character, persona, modelConfig) {
    if (!recentMessages?.length) return [];

    const characterName = character?.name || 'Character';
    const personaName   = persona?.name   || 'User';

    const excerpt = recentMessages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role === 'user' ? personaName : characterName}: ${m.content}`)
        .join('\n');

    try {
        const res = await fetch(OLLAMA_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: modelConfig?.model || appConfig.defaults.model,
                messages: [
                    { role: 'system', content: buildSystemPrompt(characterName, personaName) },
                    { role: 'user',   content: `Conversation excerpt:\n\n${excerpt}` },
                ],
                stream: false,
                think:  false,
                options: { temperature: 0.2, num_predict: 800, top_p: 0.9 },
            }),
        });

        if (!res.ok) return [];

        const data = await res.json();
        const text = (data.message?.content || '').trim()
            .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

        const jsonStart = text.indexOf('{');
        const jsonEnd   = text.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) return [];

        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        if (!Array.isArray(parsed?.memories) || parsed.memories.length === 0) return [];

        const existingAuto   = getMemories(conversationId).filter(m => m.type === 'auto');
        const existingPinned = getPinnedMemories(conversationId);
        const created = [];

        for (const item of parsed.memories) {
            if (!item.content?.trim()) continue;

            if (item.is_critical) {
                if (!item.keywords?.trim()) continue;
                if (isTooSimilar(existingPinned, item.content)) continue;
                try {
                    const id = createPinnedMemory(conversationId, item.content, {
                        keywords: item.keywords,
                        summary:  item.summary || null,
                    });
                    created.push(id);
                    existingPinned.push({ content: item.content, is_pinned: true });
                } catch { /* validação falhou — conteúdo curto demais; ignorar */ }
            } else {
                if (isTooSimilar(existingAuto, item.content)) continue;
                try {
                    const id = createAutoMemory(conversationId, item.content, {
                        keywords: item.keywords || null,
                        summary:  item.summary  || null,
                    });
                    created.push(id);
                    existingAuto.push({ content: item.content, type: 'auto' });
                } catch { /* conteúdo vazio; ignorar */ }
            }
        }

        return created;
    } catch {
        return [];
    }
}
