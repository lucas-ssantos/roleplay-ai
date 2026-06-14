import { Router } from "express";
import fs from "fs";
import path from "path";
import { getGenerationConfig, setGenerationConfig } from "../../database/queries.js";
import { appConfig } from "../../../config.js";

const publicPath = path.resolve(process.cwd(), "public");
const router = Router();

router.get("/settings", (_req, res) => {
    res.sendFile(path.join(publicPath, "settings.html"));
});

router.get("/api/presets", (_req, res) => {
    try {
        const presetsDir = path.join(process.cwd(), "config_recomendadas");
        const presets = {
            weak: {
                name: "Máquina Fraca",
                desc: "i5 7ª gen, 8GB RAM, GTX 1060 6GB",
                config: JSON.parse(fs.readFileSync(path.join(presetsDir, "low_spec.json"), "utf8")),
            },
            medium: {
                name: "Máquina Média",
                desc: "Ryzen 5 5600, 16GB RAM, RX 9060 XT 8GB",
                config: JSON.parse(fs.readFileSync(path.join(presetsDir, "medium_spec.json"), "utf8")),
            },
            strong: {
                name: "Máquina Forte",
                desc: "Ryzen 9 9800X3D, 32GB RAM, RTX 5080 16GB",
                config: JSON.parse(fs.readFileSync(path.join(presetsDir, "high_spec.json"), "utf8")),
            },
        };
        res.json({ ok: true, presets });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

router.get("/api/config", (_req, res) => {
    try {
        const config = getGenerationConfig("global");
        if (!config) return res.json({ ok: true, config: { ...appConfig.defaults } });
        res.json({ ok: true, config });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

router.post("/api/config", (req, res) => {
    try {
        const config = req.body;
        if (!config.model) return res.status(400).json({ ok: false, message: "Modelo é obrigatório." });
        setGenerationConfig("global", null, config);
        res.json({ ok: true, message: "Configuração salva com sucesso." });
    } catch (err) {
        res.status(500).json({ ok: false, message: `Erro ao salvar: ${err.message}` });
    }
});

export default router;
