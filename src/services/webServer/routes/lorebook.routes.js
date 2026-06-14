import { Router } from "express";
import path from "path";
import {
    getGlobalLorebooks, getLorebook, createLorebook,
    updateLorebook, deleteLorebook,
    getCharacterLorebookIds, setCharacterLorebooks,
} from "../../database/queries.js";

const publicPath = path.resolve(process.cwd(), "public");
const router = Router();

// ── Page ─────────────────────────────────────────────────────────────────────
router.get("/lorebooks", (_req, res) => {
    res.sendFile(path.join(publicPath, "lorebooks.html"));
});

// ── List all lorebooks ────────────────────────────────────────────────────────
router.get("/api/lorebooks", (_req, res) => {
    try {
        res.json({ ok: true, lorebooks: getGlobalLorebooks() });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Get one lorebook ──────────────────────────────────────────────────────────
router.get("/api/lorebooks/:id", (req, res) => {
    try {
        const lb = getLorebook(req.params.id);
        if (!lb) return res.status(404).json({ ok: false, message: "Lorebook não encontrado." });
        res.json({ ok: true, lorebook: lb });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Create lorebook ───────────────────────────────────────────────────────────
router.post("/api/lorebooks", (req, res) => {
    try {
        const { title, content, keywords, insertion_order } = req.body;
        if (!title?.trim())   return res.status(400).json({ ok: false, message: "Título é obrigatório." });
        if (!content?.trim()) return res.status(400).json({ ok: false, message: "Conteúdo é obrigatório." });

        const id = createLorebook(
            title.trim(),
            content.trim(),
            keywords?.trim() || null,
            'global',
            null
        );
        if (insertion_order !== undefined) {
            updateLorebook(id, { insertion_order: Number(insertion_order) });
        }
        res.json({ ok: true, id });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Update lorebook ───────────────────────────────────────────────────────────
router.put("/api/lorebooks/:id", (req, res) => {
    try {
        const { title, content, keywords, insertion_order } = req.body;
        if (title !== undefined && !title.trim())
            return res.status(400).json({ ok: false, message: "Título não pode ser vazio." });

        const ok = updateLorebook(req.params.id, {
            title:           title?.trim(),
            content:         content?.trim(),
            keywords:        keywords !== undefined ? (keywords?.trim() || null) : undefined,
            insertion_order: insertion_order !== undefined ? Number(insertion_order) : undefined,
        });
        if (!ok) return res.status(404).json({ ok: false, message: "Lorebook não encontrado." });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Delete lorebook ───────────────────────────────────────────────────────────
router.delete("/api/lorebooks/:id", (req, res) => {
    try {
        deleteLorebook(req.params.id);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Get lorebook IDs assigned to a character ──────────────────────────────────
router.get("/api/characters/:id/lorebooks", (req, res) => {
    try {
        res.json({ ok: true, lorebook_ids: getCharacterLorebookIds(req.params.id) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

// ── Set lorebook assignments for a character (full replace) ───────────────────
router.put("/api/characters/:id/lorebooks", (req, res) => {
    try {
        const { lorebook_ids } = req.body;
        if (!Array.isArray(lorebook_ids))
            return res.status(400).json({ ok: false, message: "lorebook_ids deve ser um array." });

        setCharacterLorebooks(req.params.id, lorebook_ids);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

export default router;
