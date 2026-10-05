import { readFile, writeFile, mkdir } from "node:fs/promises";
// Prepare, but never execute, an atomic additive migration with preservation checks.
export async function prepareAlphaMigration(
  files = [
    "202609290023_category_alpha.sql",
    "202609290024_preliminary_review.sql",
    "202609290025_alpha_feedback.sql",
  ],
  checks: { before?: string; after?: string } = {},
) {
  let sql = "begin;\nset local statement_timeout='60s';\n";
  if (checks.before) sql += `${checks.before}\n`;
  sql += "create temp table preserved(table_name text primary key,digest text) on commit drop;\n";
  sql += `do $$ declare t record; d text; begin
for t in select tablename from pg_tables where schemaname='public' loop
execute format('select md5(coalesce(string_agg(to_jsonb(x)::text,'''' order by to_jsonb(x)::text),'''')) from public.%I x',t.tablename) into d;
insert into preserved values(t.tablename,d);
end loop; end $$;\n`;
  for (const file of files) {
    sql +=
      (await readFile(`supabase/migrations/${file}`, "utf8"))
        .replace(/^begin;\s*$/gm, "")
        .replace(/^commit;\s*$/gm, "") + "\n";
  }
  if (checks.after) sql += `${checks.after}\n`;
  sql += `do $$ declare t record; d text; begin
for t in select * from preserved loop
execute format('select md5(coalesce(string_agg(to_jsonb(x)::text,'''' order by to_jsonb(x)::text),'''')) from public.%I x',t.table_name) into d;
if d is distinct from t.digest then raise exception 'Existing records changed: %',t.table_name; end if;
end loop;
if exists(select 1 from pg_class where relnamespace='public'::regnamespace and relkind='r' and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS missing'; end if;
if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and (has_function_privilege('anon',oid,'execute') or has_function_privilege('authenticated',oid,'execute'))) then raise exception 'Browser function privilege'; end if;
end $$;
notify pgrst,'reload schema';
commit;
select 'Alpha migrations applied; all pre-existing table digests preserved; browser RPC access denied' as verification;\n`;
  return sql;
}
if (process.argv[1]?.endsWith("prepare-alpha-migration.ts")) {
  const sql = await prepareAlphaMigration();
  await mkdir(".local", { recursive: true });
  await writeFile(".local/alpha-migrations.sql", sql);
  console.log(
    "Prepared additive alpha transaction with all existing-table preservation checks.",
  );
}
