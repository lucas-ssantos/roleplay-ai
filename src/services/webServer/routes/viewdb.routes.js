import { Router } from "express";
import path from "path";
import { getDB } from "../../database/db.js";

const publicPath = path.resolve(process.cwd(), "public");

function getDatabaseTables() {
    const db = getDB();
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    return result.length > 0 ? result[0].values.map((row) => row[0]) : [];
}

function getTableColumns(table) {
    const db = getDB();
    const result = db.exec(`PRAGMA table_info("${table}");`);
    return result.length > 0 ? result[0].values.map((row) => row[1]) : [];
}

function getTableRowCount(table) {
    const db = getDB();
    const result = db.exec(`SELECT COUNT(*) AS count FROM "${table}";`);
    return result.length > 0 ? result[0].values[0][0] : 0;
}

function getTableLastRows(table, limit = 25) {
    const db = getDB();
    const columns = getTableColumns(table);
    const orderBy = columns.includes("created_at") ? "created_at" : "rowid";
    const result = db.exec(`SELECT * FROM "${table}" ORDER BY ${orderBy} DESC LIMIT ${limit};`);
    if (result.length === 0) return { columns: [], rows: [] };
    return { columns: result[0].columns, rows: result[0].values };
}

const router = Router();

router.get("/api/viewdb", (_req, res) => {
    res.sendFile(path.join(publicPath, "viewdb.html"));
});

router.get("/api/viewdb/tables", (_req, res) => {
    try {
        const tables = getDatabaseTables();
        res.json({ ok: true, tables: tables.map((name) => ({ name, count: getTableRowCount(name) })) });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

router.get("/api/viewdb/records", (req, res) => {
    try {
        const table = String(req.query.table || "").trim();
        if (!table) return res.status(400).json({ ok: false, message: "Tabela não informada." });

        const tables = getDatabaseTables();
        if (!tables.includes(table)) return res.status(404).json({ ok: false, message: "Tabela não encontrada." });

        const { columns, rows } = getTableLastRows(table, 25);
        res.json({ ok: true, table, total: getTableRowCount(table), columns, rows });
    } catch (err) {
        res.status(500).json({ ok: false, message: err.message });
    }
});

export default router;
