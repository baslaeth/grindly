import { it, expect } from "vitest";
import { createTestDatabase } from "./database";
import { prepareAlphaMigration } from "../../scripts/prepare-alpha-migration";
import { prepareEvaluationMigration } from "../../scripts/prepare-evaluation-migration";
import { randomUUID } from "node:crypto";
it("applies only the new evaluation upgrade without rewriting existing data", async () => {
  const db = await createTestDatabase("202609290025_alpha_feedback.sql");
  try {
    const member = randomUUID(),
      finding = randomUUID(),
      version = randomUUID();
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,'isolated-upgrade@example.test',now())",
      [member],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,'isolated-upgrade@example.test')",
      [member],
    );
    await db.query(
      "insert into public.research_profiles(member_id,display_name,specialty,interest) values($1,'Isolated preserved profile','risk','Project Analysts')",
      [member],
    );
    await db.query(
      "insert into public.findings(id,question_id,author_id,visibility) values($1,'testnet-readiness',$2,'members')",
      [finding, member],
    );
    await db.query(
      "insert into public.finding_versions(id,finding_id,version,specialty,claim,sources,addition,limitations,observed_at) values($1,$2,1,'risk','Isolated historical claim',$3,'Historical addition','Known limitations',now())",
      [
        version,
        finding,
        JSON.stringify([
          {
            url: "https://ethereum.org/en/",
            label: "Isolated historical reference",
          },
        ]),
      ],
    );
    await db.query(
      "update public.findings set current_version=$1 where id=$2",
      [version, finding],
    );
    const results = await db.exec(await prepareEvaluationMigration());
    expect(JSON.stringify(results)).toContain(
      "all pre-existing table digests preserved",
    );
    expect(
      (
        await db.query<{ claim: string }>(
          "select claim from public.finding_versions where id=$1",
          [version],
        )
      ).rows[0]?.claim,
    ).toBe("Isolated historical claim");
    expect(
      (
        await db.query<{ v: string | null }>(
          "select public.alpha_primary_focus($1) v",
          [member],
        )
      ).rows[0]?.v,
    ).toBeNull();
  } finally {
    await db.close();
  }
});
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
