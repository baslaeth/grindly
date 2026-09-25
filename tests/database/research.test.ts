import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const author = "11111111-1111-4111-8111-111111111111";
const reviewer = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  for (const [id, specialty] of [
    [author, "project"],
    [reviewer, "risk"],
    [other, "operations"],
  ]) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now());",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.research_profiles(member_id,display_name,specialty) values($1,$2,$3)",
      [id, `TEST ${specialty}`, specialty],
    );
  }
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'reviewer'),($2,'reviewer')",
    [reviewer, other],
  );
  await db.query(
    "insert into public.research_reviewer_scopes values($1,'project','Project primary-source assessment',$3),($2,'project','Project primary-source assessment',$3)",
    [reviewer, other, author],
  );
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
async function mutate(
  member: string,
  action: string,
  data: Record<string, unknown> = {},
) {
  const result = await db.query<{ result: { id: string } }>(
    "select public.research_mutate($1,$2,$3::jsonb) as result",
    [member, action, JSON.stringify(data)],
  );
  return result.rows[0]!.result;
}
async function snapshot(member = author) {
  return (
    await db.query<{ s: import("../../src/research/model").Snapshot }>(
      "select public.research_snapshot($1) s",
      [member],
    )
  ).rows[0]!.s;
}
async function submit(extra: Record<string, unknown> = {}) {
  return mutate(author, "submit", {
    finding: null,
    previous: null,
    specialty: "project",
    visibility: "members",
    claim: "TEST documented dependency boundary",
    sources: [
      { label: "TEST primary source", url: "https://example.test/primary" },
    ],
    addition: "TEST compared dependencies and exclusions",
    limitations: "TEST no production conclusions",
    observedAt: new Date().toISOString(),
    ...extra,
  });
}
async function review(id: string, decision = "accept") {
  const s = await snapshot(reviewer);
  const f = s.findings.find((f) => f.id === id)!;
  const a = s.assignments.find(
    (a) => a.version_id === f.current_version && !a.completed_at,
  )!;
  return mutate(a.reviewer_id, "review", {
    version: a.version_id,
    assignment: a.id,
    decision,
    reason: "TEST primary-source scope assessed independently",
    conflicts: "None declared",
    conflictFree: true,
  });
}
async function reject(action: () => Promise<unknown>, pattern: RegExp) {
  await db.exec("savepoint rejected");
  await expect(action()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint rejected");
}
it("persists discussion replies with author attribution and no awards", async () => {
  const root = await mutate(author, "message", {
    body: "TEST dependency question",
    sources: [],
  });
  await mutate(other, "message", {
    body: "TEST practical contribution",
    sources: [],
    reply: root.id,
  });
  const s = await snapshot();
  expect(s.messages).toHaveLength(2);
  expect(s.messages.find((m) => m.reply_to === root.id)?.author_id).toBe(other);
  expect(s.awards).toHaveLength(0);
});
it("retains message origin without appropriating authorship and immutable versions", async () => {
  const message = await mutate(other, "message", {
    body: "TEST source of question",
    sources: [],
  });
  await submit({ sourceMessage: message.id });
  const s = await snapshot();
  expect(s.findings[0]!.author_id).toBe(author);
  expect(s.messages[0]!.author_id).toBe(other);
  expect(s.versions[0]!.source_message).toBe(message.id);
  await reject(
    () => db.exec("update public.finding_versions set claim='erase original'"),
    /permission denied/,
  );
});
it("filters private records, profiles, awards, reviews and counts before assembly", async () => {
  await db.query(
    "delete from public.research_reviewer_scopes where member_id=$1",
    [other],
  );
  await submit({ visibility: "reviewers" });
  const hidden = await snapshot(other);
  expect(hidden.findings).toHaveLength(0);
  expect(hidden.versions).toHaveLength(0);
  expect(hidden.assignments).toHaveLength(0);
  expect(hidden.profiles.map((p) => p.member_id)).not.toContain(author);
  expect((await snapshot(reviewer)).findings).toHaveLength(1);
});
it("forbids a member-visible finding linking private evidence", async () => {
  await submit({ visibility: "reviewers" });
  const s = await snapshot();
  await reject(
    () => submit({ relatedVersion: s.versions[0]!.id }),
    /not available for these permissions/,
  );
});
it("prevents self approval, scope bypass and undeclared conflicts", async () => {
  await submit();
  const s = await snapshot();
  const a = s.assignments[0]!;
  const input = {
    version: a.version_id,
    assignment: a.id,
    decision: "accept",
    reason: "TEST scoped rationale",
    conflicts: "None declared",
    conflictFree: true,
  };
  await reject(() => mutate(author, "review", input), /assigned in-scope/);
  await reject(
    () => mutate(reviewer, "review", { ...input, conflictFree: false }),
    /conflict-free/,
  );
  await db.query(
    "delete from public.research_reviewer_scopes where member_id=$1",
    [reviewer],
  );
  await reject(() => mutate(reviewer, "review", input), /assigned in-scope/);
});
it("awards atomically once on retries and revisions; correction withdraws brief support", async () => {
  const f = await submit();
  await review(f.id);
  await reviewRetry(f.id);
  let s = await snapshot();
  expect(s.awards).toHaveLength(1);
  expect(s.awards[0]!.xp).toBe(25);
  const old = s.versions[0]!;
  await submit({
    finding: f.id,
    previous: old.id,
    correction: "TEST changed source interpretation",
  });
  s = await snapshot();
  expect(s.findings[0]!.status).toBe("pending");
  expect(s.versions).toHaveLength(2);
  expect(s.versions[1]!.previous_version).toBe(old.id);
  await review(f.id);
  s = await snapshot();
  expect(s.awards).toHaveLength(1);
  expect(s.awards[0]!.version_id).toBe(old.id);
  expect(s.findings[0]!.status).toBe("accepted");
});
async function reviewRetry(id: string) {
  const s = await snapshot();
  const f = s.findings.find((f) => f.id === id)!;
  const a = s.assignments.find((a) => a.version_id === f.current_version)!;
  return mutate(a.reviewer_id, "review", {
    version: a.version_id,
    assignment: a.id,
    decision: "accept",
    reason: "TEST retry same decision",
    conflicts: "None declared",
    conflictFree: true,
  });
}
it("rejects stale corrections and stale review decisions", async () => {
  const f = await submit();
  const s = await snapshot();
  const a = s.assignments[0]!;
  await submit({
    finding: f.id,
    previous: s.versions[0]!.id,
    correction: "TEST adds another source",
  });
  await reject(
    () =>
      submit({
        finding: f.id,
        previous: s.versions[0]!.id,
        correction: "TEST delayed overwrite",
      }),
    /stale version/,
  );
  await reject(
    () =>
      mutate(reviewer, "review", {
        version: a.version_id,
        assignment: a.id,
        decision: "accept",
        reason: "TEST stale review",
        conflicts: "None declared",
        conflictFree: true,
      }),
    /stale review/,
  );
});
it("routes a dispute away from author, complainant and original reviewer", async () => {
  const f = await submit();
  await review(f.id);
  let s = await snapshot();
  await mutate(author, "dispute", {
    version: s.versions[0]!.id,
    reason: "TEST independent re-evaluation requested",
  });
  s = await snapshot();
  expect(s.findings[0]!.status).toBe("disputed");
  expect(s.assignments.find((a) => !a.completed_at)?.reviewer_id).toBe(other);
  await review(f.id);
  expect((await snapshot()).awards).toHaveLength(1);
  expect((await snapshot()).disputes[0]!.resolved_at).toBeTruthy();
});
it("records complementary use but neither self-use nor chat earns credit", async () => {
  const f = await submit();
  await review(f.id);
  const s = await snapshot();
  await reject(
    () =>
      mutate(author, "useful", {
        version: s.versions[0]!.id,
        detail: "TEST claiming own usefulness",
      }),
    /independent/,
  );
  await mutate(other, "useful", {
    version: s.versions[0]!.id,
    detail: "TEST used dependencies in operations checklist",
  });
  expect((await snapshot()).uses).toHaveLength(1);
  expect((await snapshot(other)).awards).toHaveLength(0);
});
it("separates specialty, authority, Silver entitlement, work acceptance and payment", async () => {
  await mutate(author, "profile", { name: "TEST operator", specialty: "risk" });
  expect((await snapshot()).roles).not.toContain("reviewer");
  await reject(
    () =>
      mutate(author, "peerRequest", {
        specialty: "project",
        request: "TEST please assess this source",
      }),
    /Silver/,
  );
  await mutate(author, "claimAssignment");
  const f = await submit();
  let s = await snapshot();
  await mutate(author, "deliverAssignment", { version: s.versions[0]!.id });
  await review(f.id);
  s = await snapshot();
  expect(s.assignment.work_status).toBe("accepted");
  expect(s.assignment.payment_status).toBe("unfunded");
  await reject(
    () =>
      db.exec("update public.research_assignment set payment_status='paid'"),
    /check constraint/,
  );
});
it("denies browser execution of research mutations and snapshots", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`set role ${role}`);
    await reject(
      () =>
        mutate(author, "profile", { name: "Hijacked", specialty: "project" }),
      /permission denied/,
    );
    await reject(() => snapshot(), /permission denied/);
    await db.exec("reset role;set role service_role");
  }
});
