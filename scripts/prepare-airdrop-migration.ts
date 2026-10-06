import { writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";
const campaign = process.argv.includes("--campaign");
const repair = process.argv.includes("--confirmation-state");
const sql = await prepareAlphaMigration(
  [
    repair
      ? "202610060032_airdrop_confirmation_state.sql"
      : campaign
        ? "202610060031_airdrop_following.sql"
        : "202610060030_airdrop_guides.sql",
  ],
  {
    before: `do $$ begin
 ${repair ? "if to_regprocedure('public.airdrop_confirmation_state()') is not null then raise exception 'Migration already applied'; end if; if to_regclass('public.airdrop_campaigns') is null then raise exception '031 prerequisite absent'; end if;" : `if to_regclass('public.${campaign ? "airdrop_campaigns" : "airdrop_guides"}') is not null then raise exception 'Migration already applied'; end if;`}
 if not exists(select 1 from pg_proc where oid='public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean)'::regprocedure and prosecdef) then raise exception '029 prerequisite absent'; end if;
 end $$;`,
    after: `do $$ begin
 ${repair ? "if to_regprocedure('public.airdrop_confirmation_state()') is null then raise exception '032 activation missing'; end if;" : ""}
 if to_regclass('public.airdrop_guides') is null then raise exception '030 activation missing'; end if;
 if has_table_privilege('anon','public.airdrop_guides','select') or has_table_privilege('authenticated','public.airdrop_guides','select') then raise exception 'Guide access leaked'; end if;
 end $$;`,
  },
);
await writeFile(
  `.local/airdrop-${repair ? "032" : campaign ? "031" : "030"}.sql`,
  sql,
);
console.log("Prepared single-migration preservation transaction; not applied.");
