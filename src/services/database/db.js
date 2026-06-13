import initSqlJs from "sql.js";

import fs from "fs/promises";

const DB_PATH = "./data/database.sqlite";

let SQL;
let db;

export async function initDB() {

    SQL = await initSqlJs({

        locateFile: file =>

            `node_modules/sql.js/dist/${file}`

    });

    try {

        const file = await fs.readFile(DB_PATH);

        db = new SQL.Database(file);

        console.log("Database loaded.");

    }

    catch {

        db = new SQL.Database();

        console.log("New database created.");

    }

    return db;

}

export function getDB(){

    return db;

}