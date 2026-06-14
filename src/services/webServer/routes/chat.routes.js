import { Router } from "express";
import path from "path";
import chatApiRouter from "../../../core/chat.js";

const publicPath = path.resolve(process.cwd(), "public");
const router = Router();

router.get("/chat/:characterId", (_req, res) => {
    res.sendFile(path.join(publicPath, "chat.html"));
});

router.use("/api", chatApiRouter);

export default router;
