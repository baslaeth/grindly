-- The old hosted executable has no room/rank model. Prevent its private RPCs
-- from exposing new Silver rows while the rank-aware executable remains local.
begin;
create or replace function public.research_snapshot(p_member uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare binding uuid;
begin
  if public.research_rank(p_member) is distinct from 'Bronze' then
    raise exception 'research: rank-aware application required'; end if;
  select id into binding from public.membership_bindings where member_id=p_member and revoked_at is null;
  return public.research_snapshot_v2(p_member,binding,'testnet-readiness');
end $$;
create or replace function public.research_mutate(p_member uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare binding uuid;
begin
  if public.research_rank(p_member) is distinct from 'Bronze' then
    raise exception 'research: rank-aware application required'; end if;
  select id into binding from public.membership_bindings where member_id=p_member and revoked_at is null;
  return public.research_mutate_v2(p_member,binding,p_action,p_data);
end $$;
revoke all on function public.research_snapshot(uuid),public.research_mutate(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.research_snapshot(uuid),public.research_mutate(uuid,text,jsonb) to service_role;
commit;
