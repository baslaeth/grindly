import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function createTestDatabase() {
  const db = new PGlite();
  try {
    await db.exec(
      await readFile(new URL("./bootstrap.sql", import.meta.url), "utf8"),
    );
    const directory = fileURLToPath(
      new URL("../../supabase/migrations/", import.meta.url),
    );
    for (const name of (await readdir(directory))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await db.exec(await readFile(`${directory}/${name}`, "utf8"));
    }
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}
