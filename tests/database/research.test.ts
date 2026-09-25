import { beforeAll, afterAll, beforeEach, afterEach, expect, it } from "vitest";
import { createTestDatabase } from "./database";
import { evidenceBrief } from "../../src/research/model";
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
  await submit({
    finding: f.id,
    previous: s.versions[0]!.id,
    correction: "TEST correcting a previously accepted deliverable",
  });
  expect((await snapshot()).assignment.work_status).toBe("needs_correction");
  expect((await snapshot()).assignment.payment_status).toBe("unfunded");
  await reject(
    () => mutate(author, "deliverAssignment", { version: s.versions[0]!.id }),
    /current member-visible contribution/,
  );
  const corrected = (await snapshot()).findings[0]!.current_version;
  await review(f.id, "correct");
  await mutate(author, "deliverAssignment", { version: corrected });
  expect((await snapshot()).assignment.work_status).toBe("needs_correction");
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

it("isolates demo review powers and private reads from genuine member work", async () => {
  await db.query(
    "update public.research_profiles set is_demo=true where member_id in ($1,$2)",
    [reviewer, other],
  );
  await submit({ visibility: "reviewers" });
  expect((await snapshot(reviewer)).findings).toHaveLength(0);
  expect((await snapshot()).assignments).toHaveLength(0);
  const version = (await snapshot()).versions[0]!;
  await reject(
    () =>
      db.query(
        "insert into public.review_assignments(version_id,reviewer_id,scope) values($1,$2,'TEST unpermitted real work')",
        [version.id, reviewer],
      ),
    /demo\/real boundary/,
  );
  await mutate(reviewer, "profile", {
    name: "Looks ordinary",
    specialty: "project",
  });
  expect(
    (await snapshot(reviewer)).profiles.find((p) => p.member_id === reviewer)
      ?.is_demo,
  ).toBe(true);
});

it("rolls back acceptance when the award insert fails", async () => {
  const f = await submit();
  await db.exec(
    "reset role; create function public.test_award_failure() returns trigger language plpgsql as $$begin raise exception 'TEST award insert failed'; end$$; create trigger test_award_failure before insert on public.award_ledger for each row execute function public.test_award_failure(); set role service_role",
  );
  await reject(() => review(f.id), /TEST award insert failed/);
  const s = await snapshot();
  expect(s.findings[0]!.status).toBe("pending");
  expect(s.decisions).toHaveLength(0);
  expect(s.awards).toHaveLength(0);
});

it("requires independent human promotion and published prerequisites", async () => {
  await reject(
    () =>
      mutate(author, "promote", {
        member: author,
        reason: "TEST promote myself without evidence",
      }),
    /independent steward/,
  );
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [reviewer],
  );
  await reject(
    () =>
      mutate(reviewer, "promote", {
        member: author,
        reason: "TEST no accepted work evidence provided",
      }),
    /prerequisites not met/,
  );
});

it("binds an assessed promotion to evidence, member, token and epoch without duplicate approvals", async () => {
  for (let i = 0; i < 3; i++) {
    const f = await submit({ claim: `TEST independent finding ${i}` });
    await review(f.id);
  }
  let s = await snapshot();
  await mutate(other, "useful", {
    version: s.findings[0]!.current_version,
    detail: "TEST complementary use of the accepted source boundary",
  });
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [reviewer],
  );
  await db.query(
    "insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')",
    [author, `0x${"a".repeat(40)}`, author],
  );
  await db.query("select public.bind_verified_wallet($1,$1,'proof')", [author]);
  const binding = (
    await db.query<{ id: string }>(
      "select public.bind_owned_token($1,$2,'1','1','10',$3) id",
      [author, `0x${"c".repeat(40)}`, `0x${"e".repeat(64)}`],
    )
  ).rows[0]!.id;
  const payload = {
    member: author,
    binding,
    reason: "TEST explicit independent evidence assessment; demonstration only",
  };
  await mutate(reviewer, "promote", payload);
  await mutate(reviewer, "promote", payload);
  const decisions = (
    await db.query<{
      evidence: unknown[];
      approved_by: string;
      ownership_epoch: string;
    }>("select * from public.promotion_decisions")
  ).rows;
  expect(decisions).toHaveLength(1);
  expect(decisions[0]!.evidence).toHaveLength(3);
  expect(decisions[0]!.approved_by).toBe(reviewer);
  expect(decisions[0]!.ownership_epoch).toBe("1");
  await mutate(author, "peerRequest", {
    specialty: "risk",
    request: "TEST independent risk follow-up requested",
  });
  s = await snapshot();
  expect(s.requests).toHaveLength(1);
});

it.each([false, true])(
  "rejects incompatible disputes/usefulness before any mutation (author demo=%s)",
  async (demo) => {
    await db.query(
      "update public.research_profiles set is_demo=$1 where member_id in ($2,$3)",
      [demo, author, reviewer],
    );
    await db.query(
      "update public.research_profiles set is_demo=$1 where member_id=$2",
      [!demo, other],
    );
    await mutate(author, "claimAssignment");
    const f = await submit();
    await review(f.id);
    const version = (await snapshot()).findings[0]!.current_version;
    await mutate(author, "deliverAssignment", { version });
    const before = await snapshot();
    const audit = await db.query(
      "select * from public.audit_events order by id",
    );
    for (const action of ["dispute", "useful"]) {
      await reject(
        () =>
          mutate(other, action, {
            version,
            reason: "TEST incompatible dispute",
            detail: "TEST incompatible usefulness",
          }),
        /same demo\/real boundary/,
      );
      expect(await snapshot()).toEqual(before);
      expect(evidenceBrief(await snapshot())).toEqual(evidenceBrief(before));
      expect(
        await db.query("select * from public.audit_events order by id"),
      ).toEqual(audit);
    }
    expect(before.assignment.work_status).toBe("accepted");
  },
);

it.each([false, true])(
  "keeps historical incompatible usefulness visible but non-qualifying (candidate demo=%s)",
  async (demo) => {
    await db.query(
      "update public.research_profiles set is_demo=$1 where member_id in ($2,$3)",
      [demo, author, reviewer],
    );
    for (let n = 0; n < 3; n++) await review((await submit()).id);
    const version = (await snapshot()).findings[0]!.current_version;
    await db.query(
      "update public.research_profiles set is_demo=$1 where member_id=$2",
      [!demo, other],
    );
    // Simulate an immutable pre-fix record, never through the corrected action.
    await db.query(
      "insert into public.finding_usefulness(version_id,member_id,specialty,detail) values($1,$2,'operations','TEST historical synthetic attribution')",
      [version, other],
    );
    const old = await db.query("select * from public.finding_usefulness");
    const use = (await snapshot()).uses[0]!;
    expect(use).toMatchObject({
      member_id: other,
      qualifies: false,
      is_demo: !demo,
    });
    await db.query(
      "insert into public.member_roles(member_id,role) values($1,'steward')",
      [reviewer],
    );
    await reject(
      () =>
        mutate(reviewer, "promote", {
          member: author,
          reason: "TEST cannot qualify on incompatible history",
        }),
      /prerequisites not met/,
    );
    expect(await db.query("select * from public.finding_usefulness")).toEqual(
      old,
    );
    // A compatible, independent use reaches the next binding check instead.
    await mutate(reviewer, "useful", {
      version,
      detail: "TEST compatible risk assessment of the evidence",
    });
    expect((await snapshot()).uses.filter((u) => u.qualifies)).toHaveLength(1);
    await reject(
      () =>
        mutate(reviewer, "promote", {
          member: author,
          reason: "TEST compatible history now qualifies",
        }),
      /current candidate binding/,
    );
  },
);

it("blocks incompatible stewards from promotion and review routing", async () => {
  await db.query(
    "update public.research_profiles set is_demo=true where member_id=$1",
    [other],
  );
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [other],
  );
  await submit();
  const before = await snapshot();
  await reject(
    () =>
      mutate(other, "promote", {
        member: author,
        reason: "TEST demo steward cannot decide for genuine member",
      }),
    /same demo\/real boundary/,
  );
  await reject(
    () => mutate(other, "assign", { version: before.versions[0]!.id }),
    /same demo\/real boundary/,
  );
  expect(await snapshot()).toEqual(before);
});

it.each([
  ["project", "risk"],
  ["risk", "project"],
])(
  "redacts hidden %s lineage from a %s audience, retaining authorized links",
  async (hiddenSpecialty, visibleSpecialty) => {
    await db.query("delete from public.research_reviewer_scopes");
    await db.query(
      "insert into public.research_reviewer_scopes values($1,$2,'TEST visible specialty assessment',$3)",
      [reviewer, visibleSpecialty, author],
    );
    const hidden = await submit({
      specialty: hiddenSpecialty,
      visibility: "reviewers",
      claim: "TEST secret hidden claim",
      sources: [
        { label: "Hidden", url: "https://hidden.example.test/private" },
      ],
    });
    const hiddenVersion = (await snapshot()).versions[0]!.id;
    const visible = await submit({
      specialty: visibleSpecialty,
      visibility: "reviewers",
      relatedVersion: hiddenVersion,
    });
    const recipient = await snapshot(reviewer);
    const serialized = JSON.stringify(recipient);
    for (const secret of [
      hidden.id,
      hiddenVersion,
      "TEST secret hidden claim",
      "hidden.example.test",
    ])
      expect(serialized).not.toContain(secret);
    expect(
      recipient.versions.find((v) => v.finding_id === visible.id)!
        .related_version,
    ).toBeNull();
    expect(
      (await snapshot()).versions.find((v) => v.finding_id === visible.id)!
        .related_version,
    ).toBe(hiddenVersion);
    const hiddenRecipient = await snapshot(other);
    expect(JSON.stringify(hiddenRecipient)).not.toContain(visible.id);
    await db.query(
      "insert into public.research_reviewer_scopes values($1,$2,'TEST hidden specialty assessment',$3)",
      [reviewer, hiddenSpecialty, author],
    );
    expect(
      (await snapshot(reviewer)).versions.find(
        (v) => v.finding_id === visible.id,
      )!.related_version,
    ).toBe(hiddenVersion);
  },
);

it.each(["scope", "role", "boundary"])(
  "invalidates revoked %s assignments under lock and reassigns independently",
  async (revocation) => {
    await submit();
    const original = (await snapshot()).assignments[0]!;
    if (revocation === "scope")
      await db.query(
        "delete from public.research_reviewer_scopes where member_id=$1",
        [reviewer],
      );
    if (revocation === "role")
      await db.query(
        "delete from public.member_roles where member_id=$1 and role='reviewer'",
        [reviewer],
      );
    if (revocation === "boundary")
      await db.query(
        "update public.research_profiles set is_demo=true where member_id=$1",
        [reviewer],
      );
    await db.query(
      "insert into public.member_roles(member_id,role) values($1,'steward'),($1,'reviewer')",
      [author],
    );
    await db.query(
      "insert into public.research_reviewer_scopes values($1,'project','TEST author may never review self',$1)",
      [author],
    );
    await mutate(author, "assign", { version: original.version_id });
    await mutate(author, "assign", { version: original.version_id });
    const s = await snapshot();
    expect(
      s.assignments.find((a) => a.id === original.id)!.completed_at,
    ).toBeTruthy();
    expect(s.assignments.filter((a) => !a.completed_at)).toMatchObject([
      { reviewer_id: other },
    ]);
    expect(
      (
        await db.query(
          "select * from public.audit_events where event_type='research.assignment_invalidated'",
        )
      ).rows,
    ).toHaveLength(1);
    await reject(
      () =>
        mutate(reviewer, "review", {
          assignment: original.id,
          version: original.version_id,
          decision: "accept",
          reason: "TEST revoked reviewer must not decide",
          conflictFree: true,
          conflicts: "None",
        }),
      /assigned in-scope/,
    );
    await review(s.findings[0]!.id);
    expect((await snapshot()).decisions[0]!.reviewer_id).toBe(other);
  },
);

it("closes an invalid assignment without fabricating a replacement when none qualify", async () => {
  await submit();
  const original = (await snapshot()).assignments[0]!;
  await db.query("delete from public.research_reviewer_scopes");
  await db.query(
    "insert into public.member_roles(member_id,role) values($1,'steward')",
    [author],
  );
  await mutate(author, "assign", { version: original.version_id });
  const s = await snapshot();
  expect(s.assignments.filter((a) => !a.completed_at)).toHaveLength(0);
  expect(s.findings[0]!.status).toBe("pending");
  expect(s.awards).toHaveLength(0);
  expect(
    (
      await db.query(
        "select * from public.audit_events where event_type='research.assignment_invalidated'",
      )
    ).rows,
  ).toHaveLength(1);
});
