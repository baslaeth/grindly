import { writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";
const sql = await prepareAlphaMigration(
  ["202610060033_airdrop_reliability.sql"],
  {
    before: `do $$ begin
 if to_regprocedure('public.airdrop_due_reminders()') is not null then raise exception '033 already applied'; end if;
 if to_regprocedure('public.airdrop_confirmation_state()') is null then raise exception '032 missing'; end if;
 end $$;`,
    after: `do $$ begin
 if to_regprocedure('public.airdrop_due_reminders()') is null then raise exception '033 absent'; end if;
 if to_regclass('public.alpha_one_complete_review') is not null then raise exception 'Append review unavailable'; end if;
 end $$;`,
  },
);
await writeFile(".local/airdrop-033.sql", sql);
console.log("Prepared 033-only preservation transaction; not applied.");
