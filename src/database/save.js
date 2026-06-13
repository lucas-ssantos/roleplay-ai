import fs from "fs/promises";

import { getDB } from "./db.js";

const DB_PATH = "./data/database.sqlite";

export async function saveDB(){

    const db = getDB();

    const data = db.export();

    const buffer = Buffer.from(data);

    await fs.writeFile(

        DB_PATH,

        buffer

    );

}