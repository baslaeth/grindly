import { mkdir, writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";

export const prepareLaunchMigration = () =>
  prepareAlphaMigration(
    ["202610050027_launch_policy.sql", "202610050028_launch_tracking.sql"],
    {
      before: `do $$ begin
if to_regclass('public.alpha_source_checks') is null
 or to_regprocedure('public.alpha_submit_v2(uuid,uuid,uuid,jsonb)') is null
 then raise exception 'Migration 026 prerequisite missing'; end if;
if to_regclass('public.launch_policy_versions') is not null
 or to_regclass('public.launch_monitor_sources') is not null
 then raise exception 'Launch migration already present; inspect before retrying'; end if;
end $$;`,
      after: `do $$ begin
if to_regclass('public.launch_policy_versions') is null
 or to_regclass('public.launch_monitor_sources') is null
 or to_regprocedure('public.launch_submit(uuid,uuid,uuid,jsonb)') is null
 or to_regprocedure('public.launch_due_reminders()') is null
 then raise exception 'Launch migration postflight missing'; end if;
end $$;`,
    },
  );

if (process.argv[1]?.endsWith("prepare-launch-migration.ts")) {
  await mkdir(".local", { recursive: true });
  await writeFile(".local/launch-migrations.sql", await prepareLaunchMigration());
  console.log("Prepared 027-028 only with 026 prerequisite, old-table digests, RLS/RPC checks and postflight. Not executed.");
}
