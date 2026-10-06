begin;
create table public.airdrop_guides (
 version_id uuid primary key references public.alpha_versions(version_id),
 details jsonb not null check(jsonb_typeof(details)='object'),
 created_at timestamptz not null default now()
);
alter table public.airdrop_guides enable row level security;
alter table public.airdrop_guides force row level security;
revoke all on public.airdrop_guides from public,anon,authenticated;
grant select,insert on public.airdrop_guides to service_role;
create trigger immutable_record before update or delete on public.airdrop_guides for each row execute function public.reject_audit_changes();

alter function public.launch_submit(uuid,uuid,uuid,jsonb) rename to launch_submit_pre_airdrop;
create function public.launch_submit(p_member uuid,p_binding uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare guide jsonb:=p_data->'airdrop'; result jsonb; k text;
begin
 if guide is not null then
  if p_data->>'category'<>'Airdrop Hunters' or jsonb_typeof(guide)<>'object'
   or guide->>'version' is distinct from '2026-10-06.1'
   or (select count(*) from jsonb_object_keys(guide))<>9
   or guide->>'stage' not in ('Unknown','Points program','Speculative rewards','Airdrop announced','Eligibility published','Claim announced','Claim open','Closed or historical')
   then raise exception 'research: invalid airdrop guide'; end if;
  foreach k in array array['version','stage','official','confirmed','speculative','steps','prerequisites','testEvidence','exclusions'] loop
   if jsonb_typeof(guide->k) is distinct from 'string' or length(btrim(guide->>k)) not between 1 and 1000
    then raise exception 'research: incomplete airdrop context'; end if;
  end loop;
  if length(guide->>'official')>500 or (guide->>'official'<>'Unknown' and guide->>'official' !~ '^https://[^[:space:]]+$')
   then raise exception 'research: invalid official reference'; end if;
 end if;
 result:=public.launch_submit_pre_airdrop(p_member,p_binding,p_request,p_data);
 if guide is not null then
  insert into public.airdrop_guides(version_id,details) values((result->>'version')::uuid,guide) on conflict do nothing;
 end if;
 return result;
end $$;
alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_pre_airdrop;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.alpha_snapshot_pre_airdrop(p_member,p_binding,p_room);
 return s||jsonb_build_object('airdropGuides',coalesce((select jsonb_agg(to_jsonb(g)) from public.airdrop_guides g
  where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=g.version_id::text)),'[]'));
end $$;
revoke all on function public.launch_submit(uuid,uuid,uuid,jsonb),public.alpha_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.launch_submit(uuid,uuid,uuid,jsonb),public.alpha_snapshot(uuid,uuid,text) to service_role;
commit;
