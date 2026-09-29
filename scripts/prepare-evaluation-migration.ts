import { mkdir, writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";
export const prepareEvaluationMigration = () =>
  prepareAlphaMigration(["202609300026_evaluation_foundation.sql"]);
if (process.argv[1]?.endsWith("prepare-evaluation-migration.ts")) {
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/evaluation-migration.sql",
    await prepareEvaluationMigration(),
  );
  console.log(
    "Prepared migration 026 only, with existing-record preservation and browser access assertions. Not executed.",
  );
}
