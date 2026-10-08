import { writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";
const sql = await prepareAlphaMigration(["202610090034_public_demo.sql"], {
  before:
    "do $$ begin if to_regclass('public.demo_access') is not null then raise exception '034 already applied'; end if; end $$;",
});
await writeFile(".local/demo-034.sql", sql);
console.log("Prepared demo migration with preservation and permission checks.");
