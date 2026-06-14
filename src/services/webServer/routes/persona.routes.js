import { Router } from "express";
import path from "path";
import { getPersona, savePersona } from "../../database/queries.js";

const publicPath = path.resolve(process.cwd(), "public");
const router = Router();

router.get("/persona", (_req, res) => {
    res.sendFile(path.join(publicPath, "persona.html"));
});

router.get("/api/persona", (_req, res) => {
    try {
        const persona = getPersona();
        if (!persona) return res.status(404).json({ ok: false, message: "Persona não encontrada." });
        res.json({ ok: true, persona });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

router.post("/api/persona", (req, res) => {
    try {
        const { name, description, avatar_url } = req.body;
        if (!name) return res.status(400).json({ ok: false, message: "O nome da persona é obrigatório." });
        savePersona({ name, description, avatar_url });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

export default router;
