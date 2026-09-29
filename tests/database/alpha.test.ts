import { beforeAll, afterAll, beforeEach, afterEach, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database";
import type { Snapshot } from "../../src/research/model";
import type { ReviewContext } from "../../src/alpha/checks";
let db: Awaited<ReturnType<typeof createTestDatabase>>;
const ids = Array.from({ length: 5 }, () => randomUUID());
let bindings: string[] = [];
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
  bindings = [];
  for (const [i, id] of ids.entries()) {
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.members(id,auth_user_id,email) values($1,$1,$2)",
      [id, `${id}@example.test`],
    );
    await db.query(
      "insert into public.research_profiles(member_id,display_name,specialty,is_demo) values($1,$2,'project',$3)",
      [id, `Isolated alpha ${i}`, i === 2 || i === 3],
    );
    await db.query(
      "insert into public.wallet_challenges(id,member_id,address,nonce,domain,uri,message,expires_at) values($1,$1,$2,$3,'localhost','http://localhost','proof',now()+interval '5 minutes')",
      [id, `0x${String(i + 1).repeat(40)}`, id],
    );
    await db.query("select public.bind_verified_wallet($1,$1,'proof')", [id]);
    bindings.push(
      await rpc<string>("bind_owned_token", [
        id,
        `0x${"c".repeat(40)}`,
        String(i + 1),
        "1",
        "10",
        `0x${"e".repeat(64)}`,
      ]),
    );
    if (i === 1 || i === 3) {
      await db.query(
        "insert into public.member_roles(member_id,role) values($1,'reviewer'),($1,'steward')",
        [id],
      );
      await db.query(
        "insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values($1,'Traders','Isolated category evidence review',$1)",
        [id],
      );
    }
  }
  await db.query(
    "insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence) select member_id,id,chain_id,contract_address,token_id,ownership_epoch,$2,'Isolated Silver fixture','[{\"kind\":\"fixture\"}]' from public.membership_bindings where id=$1",
    [bindings[4], ids[1]],
  );
  await db.exec("set role service_role");
});
afterEach(async () => {
  await db.exec("rollback;reset role");
});
async function rpc<T = Record<string, unknown>>(name: string, args: unknown[]) {
  return (
    await db.query<{ v: T }>(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) v`,
      args,
    )
  ).rows[0]!.v;
}
async function denied(fn: () => Promise<unknown>, pattern = /research:/) {
  await db.exec("savepoint denied");
  await expect(fn()).rejects.toThrow(pattern);
  await db.exec("rollback to savepoint denied");
}
const base = {
  finding: null,
  previous: null,
  category: "Traders",
  type: "analysis",
  visibility: "members",
  claim: "An isolated analysis with limited evidence",
  purpose: "Members can inspect the source",
  addition: "Independent documented addition",
  limitations: "No verified prediction is claimed",
  subject: "ETH",
  chain: "",
  contract: "",
  details: {},
  evidence: [
    {
      kind: "link",
      value: "https://ethereum.org/en/",
      label: "Primary documentation",
    },
  ],
  firstNoticed: null,
  horizon: null,
  checkCondition: "",
  sourceMessage: null,
  sourceRevision: null,
  relatedVersion: null,
  correction: null,
};
const submit = (i = 0, extra: object = {}, key = randomUUID()) =>
  rpc<{ id: string; version: string }>("alpha_submit", [
    ids[i],
    bindings[i],
    key,
    JSON.stringify({ ...base, ...extra }),
  ]);
const snapshot = (i = 0) =>
  rpc<Snapshot>("alpha_snapshot", [
    ids[i],
    bindings[i],
    i === 4 ? "silver-traders" : "bronze-traders",
  ]);
async function decide(i: number, version: string, decision = "accept") {
  const a = (await snapshot(i)).assignments.find(
    (a) => a.version_id === version && !a.completed_at,
  );
  expect(a).toBeDefined();
  return rpc("alpha_decide", [
    ids[i],
    bindings[i],
    version,
    a!.id,
    decision,
    "Examined the exact scoped evidence",
    "None declared",
    true,
  ]);
}
it("saves category independently of specialty; pending is shared with the permitted exact rank", async () => {
  const f = await submit();
  const s = await snapshot(1);
  expect(s.findings.find((v) => v.id === f.id)?.status).toBe("pending");
  expect(s.alphas?.[0]?.category).toBe("Traders");
  expect(s.versions[0]?.specialty).toBe("project");
  expect(s.alphas?.[0]?.first_noticed).toBeNull();
  expect(s.alphas?.[0]?.created_at).toBeTruthy();
  expect(JSON.stringify(await snapshot(4))).not.toContain(f.version);
  expect(JSON.stringify(await snapshot(2))).not.toContain(f.id);
});
it("idempotent submissions reject request-key reuse and keep immutable versions", async () => {
  const key = randomUUID();
  const f = await submit(0, {}, key);
  expect(await submit(0, {}, key)).toEqual(f);
  await denied(() => submit(0, { claim: "Changed incompatible request" }, key));
  await denied(
    () =>
      db.query(
        "update public.alpha_versions set subject='Other' where version_id=$1",
        [f.version],
      ),
    /permission denied|immutable|append/i,
  );
  expect((await snapshot()).versions).toHaveLength(1);
});
it("genuine acceptance records feedback and activity but no unapproved XP", async () => {
  const f = await submit();
  expect(await decide(1, f.version)).toMatchObject({
    credit: "blocked_no_approved_rule",
  });
  const s = await snapshot();
  expect(s.findings[0]?.status).toBe("accepted");
  expect(s.awards).toHaveLength(0);
  expect(s.activity?.map((a) => a.kind)).toEqual(["evaluation"]);
  expect(s.creditStates?.[0]?.status).toBe("blocked_no_approved_rule");
});
it("isolated approved demo award is atomic and unique through retry and correction", async () => {
  const f = await submit(2);
  const a = (await snapshot(3)).assignments[0]!;
  await decide(3, f.version);
  await rpc("alpha_decide", [
    ids[3],
    bindings[3],
    f.version,
    a.id,
    "accept",
    "Retry exact evaluation",
    "None declared",
    true,
  ]);
  const next = await submit(2, {
    finding: f.id,
    previous: f.version,
    correction: "A documented correction",
    claim: "A corrected isolated evidence claim",
  });
  await decide(3, next.version);
  const s = await snapshot(2);
  expect(s.versions).toHaveLength(2);
  expect(s.awards).toHaveLength(1);
  expect(s.awards[0]?.xp).toBe(s.policy.acceptance_xp);
  expect(s.activity?.filter((a) => a.kind === "xp")).toHaveLength(1);
});
it("prevents self review, demo authority, stale scopes and wrong-rank reads", async () => {
  const f = await submit();
  const a = (await snapshot(1)).assignments[0]!;
  for (const i of [0, 2, 3, 4])
    await denied(() =>
      rpc("alpha_decide", [
        ids[i],
        bindings[i],
        f.version,
        a.id,
        "accept",
        "Independent assessment",
        "None declared",
        true,
      ]),
    );
  await db.exec("reset role");
  await db.query(
    "delete from public.alpha_reviewer_scopes where member_id=$1",
    [ids[1]],
  );
  await db.exec("set role service_role");
  await denied(() =>
    rpc("alpha_decide", [
      ids[1],
      bindings[1],
      f.version,
      a.id,
      "accept",
      "Independent assessment",
      "None declared",
      true,
    ]),
  );
  await rpc("research_assign_v2", [f.version, "initial"]);
  expect((await snapshot()).assignments.every((a) => a.completed_at)).toBe(
    true,
  );
  await denied(() =>
    rpc("alpha_version_guard", [ids[4], bindings[4], f.version]),
  );
});
it("restricts sensitive alpha and duplicate context; retries do not create concurrent model operations", async () => {
  const hidden = await submit(1, {
    visibility: "reviewers",
    subject: "Secret subject",
  });
  const prior = await submit(0);
  const current = await submit(0);
  const ctx = await rpc<ReviewContext>("alpha_begin_review", [
    ids[0],
    bindings[0],
    current.version,
  ]);
  expect(JSON.stringify(ctx)).not.toContain(hidden.version);
  expect(ctx.candidates.some((c) => c.id === prior.version)).toBe(true);
  expect(
    await rpc("alpha_begin_review", [ids[0], bindings[0], current.version]),
  ).toMatchObject({ existing: true, run: ctx.run });
  await denied(() =>
    rpc("alpha_begin_review", [ids[4], bindings[4], current.version]),
  );
  await rpc("alpha_finish_review", [
    ctx.run,
    "blocked",
    null,
    null,
    null,
    "[]",
    "[]",
    "provider_not_approved",
  ]);
  expect((await snapshot()).preliminary?.[0]?.status).toBe("blocked");
  await denied(
    () =>
      db.query(
        "update public.alpha_preliminary_runs set error_code='provider_failed' where id=$1",
        [ctx.run],
      ),
    /immutable/,
  );
});
it("keeps message source version and original time through edits", async () => {
  const m = await rpc<{ id: string; revision: string }>("chat_mutate", [
    ids[0],
    bindings[0],
    "bronze-traders",
    randomUUID(),
    "send",
    JSON.stringify({
      body: "Original evidence message",
      reply: null,
      attachments: [],
    }),
  ]);
  const f = await submit(0, {
    sourceMessage: m.id,
    sourceRevision: m.revision,
    evidence: [
      {
        kind: "message",
        value: m.id,
        revision: m.revision,
        label: "Original discussion",
      },
    ],
  });
  await rpc("chat_mutate", [
    ids[0],
    bindings[0],
    "bronze-traders",
    randomUUID(),
    "edit",
    JSON.stringify({
      message: m.id,
      revision: m.revision,
      body: "Later edited text",
    }),
  ]);
  const s = await snapshot();
  expect(s.sourceSnapshots?.find((s) => s.version === f.version)?.body).toBe(
    "Original evidence message",
  );
  expect(s.alphas?.[0]?.source_created_at).toBeTruthy();
  await denied(() =>
    submit(0, { sourceMessage: m.id, sourceRevision: m.revision }),
  );
  const correction = await submit(0, {
    finding: f.id,
    previous: f.version,
    correction: "Preserves the original quoted message",
    sourceMessage: m.id,
    sourceRevision: m.revision,
  });
  expect(
    (await snapshot()).sourceSnapshots?.find(
      (s) => s.version === correction.version,
    )?.body,
  ).toBe("Original evidence message");
  const latest = (await snapshot()).messages.find((x) => x.id === m.id)!;
  await rpc("chat_mutate", [
    ids[0],
    bindings[0],
    "bronze-traders",
    randomUUID(),
    "delete",
    JSON.stringify({ message: m.id, revision: latest.revision }),
  ]);
  expect(
    (await snapshot()).sourceSnapshots?.find((s) => s.version === f.version)
      ?.body,
  ).toBe("Original evidence message");
  const afterDelete = await submit(0, {
    finding: f.id,
    previous: correction.version,
    correction: "Preserved attribution after chat deletion",
    sourceMessage: m.id,
    sourceRevision: m.revision,
  });
  expect(
    (await snapshot()).sourceSnapshots?.find(
      (s) => s.version === afterDelete.version,
    )?.body,
  ).toBe("Original evidence message");
});
it("protects alpha attachments from other ranks, demo identities, and unrelated versions", async () => {
  const media = randomUUID();
  await rpc("chat_upload", [
    ids[0],
    bindings[0],
    "bronze-traders",
    media,
    "image/gif",
    "R0lGODlh",
    6,
  ]);
  const f = await submit(0, {
    evidence: [{ kind: "attachment", value: media, label: "Isolated image" }],
  });
  const other = await submit();
  expect(
    await rpc("alpha_media_read", [ids[1], bindings[1], media, f.version]),
  ).toMatchObject({ type: "image/gif" });
  for (const i of [2, 4])
    await denied(() =>
      rpc("alpha_media_read", [ids[i], bindings[i], media, f.version]),
    );
  await denied(() =>
    rpc("alpha_media_read", [ids[1], bindings[1], media, other.version]),
  );
  await denied(() =>
    submit(1, {
      evidence: [
        { kind: "attachment", value: media, label: "Not the uploader" },
      ],
    }),
  );
  await db.exec("set role authenticated");
  await denied(
    () => rpc("alpha_media_read", [ids[0], bindings[0], media, f.version]),
    /permission denied/,
  );
});
it("future outcomes remain pending and direct authenticated access is denied", async () => {
  const f = await submit(0, {
    type: "prediction",
    horizon: new Date(Date.now() + 86400000).toISOString(),
    checkCondition: "Observe the declared counterevidence",
  });
  await denied(() =>
    rpc("alpha_record_outcome", [
      ids[0],
      bindings[0],
      f.version,
      "known",
      "Invented successful outcome",
      "[]",
    ]),
  );
  await db.exec("set role authenticated");
  await denied(
    () => rpc("alpha_snapshot", [ids[0], bindings[0], "bronze-traders"]),
    /permission denied/,
  );
  await denied(
    () => db.query("select * from public.alpha_preliminary_runs"),
    /permission denied/,
  );
});
it("reject and correction decisions preserve reasons without credit", async () => {
  const f = await submit();
  await decide(1, f.version, "reject");
  expect((await snapshot()).findings[0]?.status).toBe("rejected");
  const c = await submit(0, {
    finding: f.id,
    previous: f.version,
    correction: "Correcting the missing evidence",
  });
  await decide(1, c.version, "correct");
  const s = await snapshot();
  expect(s.findings[0]?.status).toBe("needs_correction");
  expect(s.decisions).toHaveLength(2);
  expect(s.awards).toHaveLength(0);
});
it("persists sourced feedback with rank and demo isolation, without awards", async () => {
  const f = await submit();
  const key = randomUUID();
  const args = [
    ids[1],
    bindings[1],
    f.version,
    key,
    "challenge",
    "A sourced counterargument",
    "https://ethereum.org/en/",
  ];
  const id = await rpc("alpha_add_feedback", args);
  expect(await rpc("alpha_add_feedback", args)).toBe(id);
  expect((await snapshot()).alphaFeedback?.[0]?.id).toBe(id);
  expect((await snapshot()).awards).toHaveLength(0);
  for (const i of [0, 2, 4])
    await denied(() =>
      rpc("alpha_add_feedback", [
        ids[i],
        bindings[i],
        f.version,
        randomUUID(),
        "useful",
        "Independent usefulness",
        "https://ethereum.org/en/",
      ]),
    );
});
it("rejected work can be appealed without assigning the original reviewer or self", async () => {
  const f = await submit();
  await decide(1, f.version, "reject");
  await rpc("alpha_appeal", [
    ids[0],
    bindings[0],
    f.version,
    "Requesting a second independent assessment",
  ]);
  const s = await snapshot();
  expect(s.findings[0]?.status).toBe("disputed");
  expect(s.assignments.filter((a) => !a.completed_at)).toHaveLength(0);
  expect(s.disputes).toHaveLength(1);
  expect(s.awards).toHaveLength(0);
});
it("records a due isolated outcome without rewriting the claim or awarding XP", async () => {
  const finding = randomUUID(),
    version = randomUUID();
  await db.query(
    "insert into public.findings(id,question_id,author_id,visibility) values($1,'bronze-traders',$2,'members')",
    [finding, ids[0]],
  );
  await db.query(
    "insert into public.finding_versions(id,finding_id,version,specialty,claim,sources,addition,limitations,observed_at,submitted_at) values($1,$2,1,'project','Isolated matured claim','[{\"url\":\"https://ethereum.org/en/\",\"label\":\"Primary\"}]','Independent observation','Synthetic record only',now()-interval '2 days',now()-interval '2 days')",
    [version, finding],
  );
  await db.query(
    "insert into public.alpha_versions(version_id,category,contribution_type,purpose,subject,details,evidence,horizon,check_condition,created_at) values($1,'Traders','prediction','Isolated outcome test','ETH','{}','[{\"kind\":\"link\",\"value\":\"https://ethereum.org/en/\",\"label\":\"Primary\"}]',now()-interval '1 day','Observe the specified invalidation',now()-interval '2 days')",
    [version],
  );
  await db.query("update public.findings set current_version=$1 where id=$2", [
    version,
    finding,
  ]);
  await denied(() =>
    rpc("alpha_record_outcome", [
      ids[0],
      bindings[0],
      version,
      "known",
      "Author cannot certify own outcome",
      "[]",
    ]),
  );
  await rpc("alpha_record_outcome", [
    ids[1],
    bindings[1],
    version,
    "inconclusive",
    "Isolated matured fixture has insufficient observed facts",
    "[]",
  ]);
  const s = await snapshot();
  expect(s.outcomes?.[0]?.status).toBe("inconclusive");
  expect(s.versions[0]?.claim).toBe("Isolated matured claim");
  expect(s.awards).toHaveLength(0);
});
