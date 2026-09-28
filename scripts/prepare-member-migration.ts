import { readFile, writeFile, mkdir } from "node:fs/promises";
// Produce one reviewed SQL Editor transaction. Never sends credentials or runs SQL.
const tables = [
  "members",
  "wallet_bindings",
  "membership_bindings",
  "member_roles",
  "promotion_decisions",
  "nft_tier_events",
  "research_profiles",
  "discussion_messages",
  "findings",
  "finding_versions",
  "review_decisions",
  "award_ledger",
  "audit_events",
];
const digest = (table: string) =>
  `select md5(coalesce(string_agg((to_jsonb(t)-'sequence'-'source_revision')::text,'' order by (to_jsonb(t)-'sequence'-'source_revision')::text),'')) from public.${table} t`;
let sql =
  "begin;\nset local statement_timeout='60s';\ncreate temp table preserved(table_name text primary key,digest text);\n";
for (const table of tables)
  sql += `insert into preserved values('${table}',(${digest(table)}));\n`;
for (const file of [
  "202609290016_member_boundaries.sql",
  "202609290017_room_chat.sql",
  "202609290018_home_activity.sql",
]) {
  sql +=
    (await readFile(`supabase/migrations/${file}`, "utf8"))
      .replace(/^begin;\s*$/gm, "")
      .replace(/^commit;\s*$/gm, "") + "\n";
}
for (const table of tables)
  sql += `do $$ begin if (${digest(table)}) is distinct from (select digest from preserved where table_name='${table}') then raise exception 'Existing ${table} changed'; end if; end $$;\n`;
sql += `do $$ begin
if exists(select 1 from pg_class where relnamespace='public'::regnamespace and relkind='r' and (not relrowsecurity or not relforcerowsecurity)) then raise exception 'RLS missing'; end if;
if exists(select 1 from pg_tables where schemaname='public' and (has_table_privilege('anon',format('%I.%I',schemaname,tablename),'select') or has_table_privilege('authenticated',format('%I.%I',schemaname,tablename),'select'))) then raise exception 'Browser table privilege'; end if;
if exists(select 1 from pg_proc where pronamespace='public'::regnamespace and (has_function_privilege('anon',oid,'execute') or has_function_privilege('authenticated',oid,'execute'))) then raise exception 'Browser function privilege'; end if;
end $$;
notify pgrst,'reload schema';
commit;
select 'member experience migrations applied; 13 existing-table digests preserved; browser access denied' as verification;
`;
await mkdir(".local", { recursive: true });
await writeFile(".local/member-migrations.sql", sql);
console.log(
  "Prepared atomic migration with preservation and browser-permission assertions.",
);
