begin;
alter table public.opportunity_requirements add column verified_requirements text;
create function public.capture_opportunity_requirement() returns trigger
language plpgsql set search_path='' as $$
begin
  select requirements into new.verified_requirements from public.opportunities where id=new.opportunity_id for share;
  return new;
end $$;
create trigger capture_requirement before insert or update on public.opportunity_requirements
  for each row execute function public.capture_opportunity_requirement();

alter function public.opportunity_action(uuid,uuid,uuid,text) rename to opportunity_action_base;
create function public.opportunity_action(p_member uuid,p_binding uuid,p_id uuid,p_action text) returns jsonb
language plpgsql set search_path='' as $$
declare result jsonb; o public.opportunities;
begin
  -- Retain every existing gate before checking the specific assessed terms.
  result:=public.opportunity_action_base(p_member,p_binding,p_id,'state');
  select * into o from public.opportunities where id=p_id for share;
  if (result->>'eligible')::boolean and o.approval_required and not exists(
    select 1 from public.opportunity_requirements where opportunity_id=o.id and member_id=p_member
      and approved and verified_requirements=o.requirements
  ) then
    result:=result || jsonb_build_object('eligible',false,'reason','Updated requirements need operator verification');
  end if;
  if p_action='state' then return result; end if;
  if not (result->>'eligible')::boolean then raise exception 'research: participation requirements not met'; end if;
  return public.opportunity_action_base(p_member,p_binding,p_id,p_action);
end $$;
revoke all on function public.capture_opportunity_requirement(),public.opportunity_action(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.opportunity_action(uuid,uuid,uuid,text) to service_role;
commit;
