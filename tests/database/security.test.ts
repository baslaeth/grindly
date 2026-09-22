import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "./database";

let db: Awaited<ReturnType<typeof createTestDatabase>>;
const tables = [
  "members",
  "invitations",
  "member_roles",
  "wallet_challenges",
  "wallet_bindings",
  "chain_operations",
  "issuer_nonces",
  "membership_bindings",
  "promotion_decisions",
  "audit_events",
];

beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});

describe("empty database migration and browser isolation", () => {
  it("creates all required tables with forced RLS and no browser policies", async () => {
    const { rows } = await db.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      "select relname, relrowsecurity, relforcerowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(rows.map((row) => row.relname).sort()).toEqual([...tables].sort());
    expect(
      rows.every((row) => row.relrowsecurity && row.relforcerowsecurity),
    ).toBe(true);
    expect(
      (await db.query("select * from pg_policies where schemaname = 'public'"))
        .rows,
    ).toHaveLength(0);
  });

  for (const role of ["anon", "authenticated"]) {
    for (const table of tables) {
      it(`${role} cannot read or insert ${table}`, async () => {
        await db.exec(`set role ${role}`);
        try {
          await expect(
            db.query(`select * from public.${table}`),
          ).rejects.toThrow(/permission denied/);
          await expect(
            db.exec(`insert into public.${table} default values`),
          ).rejects.toThrow(/permission denied/);
        } finally {
          await db.exec("reset role");
        }
      });
    }
    it(`${role} cannot create objects or execute internal functions`, async () => {
      await db.exec(`set role ${role}`);
      try {
        await expect(
          db.exec("create table public.browser_created (id integer)"),
        ).rejects.toThrow(/permission denied/);
        const { rows } = await db.query<{ allowed: boolean }>(
          "select has_function_privilege(current_user, 'public.reject_audit_changes()', 'execute') as allowed",
        );
        expect(rows[0]?.allowed).toBe(false);
      } finally {
        await db.exec("reset role");
      }
    });
  }

  it("keeps new tables and functions private by default", async () => {
    await db.exec(
      "create table public.future_data (id integer); create function public.future_function() returns integer language sql as 'select 1'",
    );
    for (const role of ["anon", "authenticated"]) {
      const { rows } = await db.query<{
        table_access: boolean;
        function_access: boolean;
      }>(
        "select has_table_privilege($1, 'public.future_data', 'select') as table_access, has_function_privilege($1, 'public.future_function()', 'execute') as function_access",
        [role],
      );
      expect(rows[0]).toEqual({ table_access: false, function_access: false });
    }
    await db.exec(
      "drop table public.future_data; drop function public.future_function()",
    );
  });

  it("permits server-only inserts but preserves append-only audit events", async () => {
    await db.exec("set role service_role");
    try {
      await db.exec(
        "insert into public.audit_events (event_type) values ('test.security')",
      );
      expect(
        (await db.query("select * from public.audit_events")).rows,
      ).toHaveLength(1);
      await expect(db.exec("delete from public.audit_events")).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec("reset role");
    }
    await expect(
      db.exec("update public.audit_events set event_type = 'changed'"),
    ).rejects.toThrow(/append-only/);
  });

  it("rejects out-of-range and ambiguous uint256 representations", async () => {
    for (const value of ["-1", "01", "1.5", "1e5", (2n ** 256n).toString()]) {
      await expect(
        db.query("select $1::public.uint256_decimal", [value]),
      ).rejects.toThrow(/violates check constraint/);
    }
    const maximum = (2n ** 256n - 1n).toString();
    expect(
      (
        await db.query<{ value: string }>(
          "select $1::public.uint256_decimal as value",
          [maximum],
        )
      ).rows[0]?.value,
    ).toBe(maximum);
  });
});
