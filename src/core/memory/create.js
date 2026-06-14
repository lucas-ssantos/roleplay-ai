import { createMemory } from "../../services/database/queries.js";

/**
 * Memória gerada automaticamente pelo summaryService quando o contexto ultrapassa o limite.
 * Ex: "Na sessão anterior, o usuário revelou que trabalha à noite."
 */
export function createAutoMemory(conversationId, content, { keywords = null, summary = null } = {}) {
    return createMemory(conversationId, 'auto', content, keywords, 1.0, false, summary);
}

/**
 * Memória criada manualmente pelo usuário através da interface.
 * Ex: "Ele adora café e odeia segunda-feira."
 */
export function createManualMemory(conversationId, content, { keywords = null, summary = null } = {}) {
    return createMemory(conversationId, 'manual', content, keywords, 1.0, false, summary);
}

/**
 * Memória sempre incluída no contexto, independente de relevância.
 * Ex: Fatos permanentes do personagem ou regras fixas da narrativa.
 * Tem relevance_weight maior para ordenar antes das demais.
 */
export function createPinnedMemory(conversationId, content, { keywords = null, summary = null } = {}) {
    return createMemory(conversationId, 'pinned', content, keywords, 1.5, true, summary);
}
