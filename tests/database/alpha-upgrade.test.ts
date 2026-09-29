import { it, expect } from "vitest";
import { createTestDatabase } from "./database";
import { prepareAlphaMigration } from "../../scripts/prepare-alpha-migration";
it("applies the exact hosted upgrade transaction preserving every existing table", async () => {
  const db = await createTestDatabase(
    "202609290022_requirement_observation.sql",
  );
  try {
    const result = await db.exec(await prepareAlphaMigration());
    expect(JSON.stringify(result)).toContain(
      "all pre-existing table digests preserved",
    );
  } finally {
    await db.close();
  }
});
