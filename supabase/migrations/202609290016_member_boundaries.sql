begin;

alter table public.research_questions drop constraint research_questions_rank_check;
alter table public.research_questions add constraint research_questions_rank_check
  check(rank in ('Bronze','Silver','Gold','Platinum','Diamond'));
alter table public.nft_tier_events drop constraint nft_tier_events_tier_check;
alter table public.nft_tier_events add constraint nft_tier_events_tier_check
  check(tier in ('Bronze','Silver','Gold','Platinum','Diamond'));
-- No upgrade action or threshold is introduced. These rooms are accessible only
-- when the existing, live-checked membership has the corresponding recorded tier.
insert into public.research_questions(id,title,purpose,gaps,rank,category)
select lower(r.rank)||'-'||case when q.category='General' then 'general' else substr(q.id,8) end,
  q.title,q.purpose,q.gaps,r.rank,q.category
from public.research_questions q cross join (values('Gold'),('Platinum'),('Diamond')) r(rank)
where q.rank='Bronze';

create function public.member_room_guard(p_member uuid,p_binding uuid,p_room text) returns void
language plpgsql stable set search_path='' as $$
begin
  if not exists(select 1 from public.membership_bindings b join public.wallet_bindings w
    on w.id=b.wallet_binding_id and w.member_id=b.member_id and w.revoked_at is null
    where b.id=p_binding and b.member_id=p_member and b.revoked_at is null)
    or not exists(select 1 from public.research_questions where id=p_room and rank=public.research_rank(p_member))
  then raise exception 'research: room unavailable'; end if;
end $$;

-- v2 stays available for the older deployed executable. The new executable uses
-- v3, including strict fixture separation and recipient-specific linked IDs.
create function public.research_snapshot_v3(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb; fs jsonb; vs jsonb; ms jsonb; ps jsonb; ds jsonb; k text;
begin
  s:=public.research_snapshot_v2(p_member,p_binding,p_room);
  select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(s->'profiles') x
    where public.research_compatible(p_member,(x->>'member_id')::uuid);
  select coalesce(jsonb_agg(x),'[]') into ds from jsonb_array_elements(s->'directory') x
    where public.research_compatible(p_member,(x->>'id')::uuid);
  select coalesce(jsonb_agg(x),'[]') into ms from jsonb_array_elements(s->'messages') x
    where public.research_compatible(p_member,(x->>'author_id')::uuid);
  select coalesce(jsonb_agg(x),'[]') into fs from jsonb_array_elements(s->'findings') x
    where public.research_compatible(p_member,(x->>'author_id')::uuid);
  select coalesce(jsonb_agg(x || jsonb_build_object(
    'related_version',case when exists(select 1 from public.finding_versions v join public.findings f on f.id=v.finding_id
      where v.id=(x->>'related_version')::uuid and public.research_compatible(p_member,f.author_id)
      and public.research_can_view_v2(p_member,f.id)) then x->'related_version' else 'null'::jsonb end,
    'source_message',case when exists(select 1 from jsonb_array_elements(ms) m where m->>'id'=x->>'source_message')
      then x->'source_message' else 'null'::jsonb end
  )),'[]') into vs from jsonb_array_elements(s->'versions') x
    where exists(select 1 from jsonb_array_elements(fs) f where f->>'id'=x->>'finding_id');
  s:=s || jsonb_build_object('profiles',ps,'directory',ds,'messages',ms,'findings',fs,'versions',vs,
    'demoProfiles','[]'::jsonb,'demoMessages','[]'::jsonb,'demoDelegations','[]'::jsonb);
  foreach k in array array['assignments','decisions','uses','disputes'] loop
    s:=jsonb_set(s,array[k],coalesce((select jsonb_agg(x) from jsonb_array_elements(s->k) x
      where exists(select 1 from jsonb_array_elements(vs) v where v->>'id'=x->>'version_id')),'[]'));
  end loop;
  s:=jsonb_set(s,'{requests}',coalesce((select jsonb_agg(x) from jsonb_array_elements(s->'requests') x
    where public.research_compatible(p_member,(x->>'member_id')::uuid)),'[]'));
  if not coalesce((select is_demo from public.research_profiles where member_id=p_member),false) then
    s:=jsonb_set(s,'{assignment}','null');
  end if;
  return s;
end $$;

create function public.research_mutate_v3(p_member uuid,p_binding uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare target uuid;
begin
  if p_action='submit' and p_data->>'sourceMessage' is not null and p_data->>'sourceRevision' is not null then
    perform pg_advisory_xact_lock(hashtextextended('message:'||(p_data->>'sourceMessage'),0));
    if (select id from public.chat_revisions where message_id=(p_data->>'sourceMessage')::uuid order by sequence desc limit 1)
      is distinct from (p_data->>'sourceRevision')::uuid then raise exception 'research: source changed; reopen the contribution editor'; end if;
  end if;
  if p_data->>'relatedVersion' is not null then
    select f.author_id into target from public.findings f join public.finding_versions v on v.finding_id=f.id
      where v.id=(p_data->>'relatedVersion')::uuid;
    if target is null or not public.research_compatible(p_member,target) then raise exception 'research: related record unavailable'; end if;
  end if;
  return public.research_mutate_v2(p_member,p_binding,p_action,p_data);
end $$;

revoke all on function public.member_room_guard(uuid,uuid,text),public.research_snapshot_v3(uuid,uuid,text),public.research_mutate_v3(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.member_room_guard(uuid,uuid,text),public.research_snapshot_v3(uuid,uuid,text),public.research_mutate_v3(uuid,uuid,text,jsonb) to service_role;
commit;
