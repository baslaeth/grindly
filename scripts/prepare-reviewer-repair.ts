import { writeFile } from "node:fs/promises";
import { prepareAlphaMigration } from "./prepare-alpha-migration";
export const prepareReviewerRepair = () =>
  prepareAlphaMigration(["202610060029_launch_reviewer_boundary.sql"], {
    before: `do $$ begin
if to_regprocedure('public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean)') is null then raise exception '028 prerequisite missing'; end if;
if (select prosecdef from pg_proc where oid='public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean)'::regprocedure) then raise exception '029 already active'; end if;
end $$;`,
    after: `do $$ begin
if not (select prosecdef from pg_proc where oid='public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean)'::regprocedure) then raise exception '029 postflight failed'; end if;
end $$;`,
  });
if (process.argv[1]?.endsWith("prepare-reviewer-repair.ts")) {
  await writeFile(".local/reviewer-repair.sql", await prepareReviewerRepair());
  console.log("Prepared 029-only preservation transaction; not executed.");
}
