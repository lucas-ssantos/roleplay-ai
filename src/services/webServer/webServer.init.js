import express from "express";
import fs from "fs";
import path from "path";
import { registerWebServer } from "../../core/shutdown.js";
import { appConfig } from "../../config.js";

import indexRouter     from "./routes/index.routes.js";
import checkRouter     from "./routes/check.routes.js";
import personaRouter   from "./routes/persona.routes.js";
import characterRouter from "./routes/character.routes.js";
import chatRouter      from "./routes/chat.routes.js";
import settingsRouter  from "./routes/settings.routes.js";
import viewdbRouter    from "./routes/viewdb.routes.js";
import lorebookRouter  from "./routes/lorebook.routes.js";

export async function startWebServer(port = appConfig.port) {
    const app = express();
    const publicPath = path.resolve(process.cwd(), "public");
    const uploadDir  = path.join(publicPath, "assets/uploads");

    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    app.use(express.json({ limit: "10mb" }));

    app.use(indexRouter);
    app.use(checkRouter);
    app.use(personaRouter);
    app.use(characterRouter(uploadDir));
    app.use(chatRouter);
    app.use(settingsRouter);
    app.use(viewdbRouter);
    app.use(lorebookRouter);

    app.use(express.static(publicPath));

    const server = app.listen(port, () => {
        console.log(`Web server listening on http://localhost:${port}`);
    });

    registerWebServer(server);
    return { app, server };
}
