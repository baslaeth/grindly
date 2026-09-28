begin;
create function public.research_snapshot_v2(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare rank_name text; room_id text; result jsonb;
begin
  if not exists(select 1 from public.membership_bindings where id=p_binding and member_id=p_member and revoked_at is null) then
    raise exception 'research: active binding required'; end if;
  rank_name:=public.research_rank(p_member);
  room_id:=p_room;
  if room_id is null then select id into room_id from public.research_questions where rank=rank_name and category='General'; end if;
  if not exists(select 1 from public.research_questions where id=room_id and rank=rank_name) then
    raise exception 'research: room unavailable in this rank'; end if;
  with visible as (select f.* from public.findings f where public.research_can_view_v2(p_member,f.id)),
  versions as (select v.* from public.finding_versions v join visible f on f.id=v.finding_id),
  messages as (select m.* from public.discussion_messages m join public.research_questions q on q.id=m.question_id where q.rank=rank_name),
  people as (select p.* from public.research_profiles p where public.research_rank(p.member_id)=rank_name),
  directory as (
    select jsonb_build_object('id',m.id,'name',coalesce(p.display_name,'Member'),
      'bio',coalesce(p.bio,''),'specialty',coalesce(p.interest,'Not specified'),
      'is_demo',coalesce(p.is_demo,false),'tier',rank_name,
      'token',b.token_id,'contract',b.contract_address,'bound_at',b.bound_at,
      'personal_xp',(select coalesce(sum(a.xp),0) from public.award_ledger a where a.member_id=m.id),
      'acquisitions',coalesce((select jsonb_agg(jsonb_build_object('kind',e.kind,'at',e.recorded_at) order by e.recorded_at)
        from public.nft_acquisition_events e join public.membership_bindings history on history.id=e.binding_id
        where history.member_id=m.id and history.contract_address=b.contract_address and history.token_id=b.token_id),'[]'),
      'progression',coalesce((select jsonb_agg(jsonb_build_object('kind','progressed','at',e.recorded_at,'tier',e.tier))
        from public.nft_tier_events e where e.contract_address=b.contract_address and e.token_id=b.token_id),'[]')) as entry
    from public.members m join public.membership_bindings b on b.member_id=m.id and b.revoked_at is null
    left join public.research_profiles p on p.member_id=m.id
    where public.research_rank(m.id)=rank_name
  )
  select jsonb_build_object(
    'question',(select to_jsonb(q) from public.research_questions q where id=room_id),
    'rooms',(select jsonb_agg(to_jsonb(q) order by (category<>'General'),category) from public.research_questions q where rank=rank_name),
    'directory',coalesce((select jsonb_agg(entry order by entry->>'name') from directory),'[]'),
    'profiles',coalesce((select jsonb_agg(to_jsonb(p) order by display_name) from people p),'[]'),
    'messages',coalesce((select jsonb_agg(to_jsonb(m) order by created_at,id) from messages m),'[]'),
    'findings',coalesce((select jsonb_agg(to_jsonb(f) order by created_at desc,id) from visible f),'[]'),
    'versions',coalesce((select jsonb_agg((to_jsonb(v) || jsonb_build_object(
      'related_version',case when exists(select 1 from versions target where target.id=v.related_version) then v.related_version else null end,
      'source_message',case when exists(select 1 from messages target where target.id=v.source_message) then v.source_message else null end))
      order by submitted_at,version,id) from versions v),'[]'),
    'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from public.review_assignments a join versions v on v.id=a.version_id),'[]'),
    'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by created_at) from public.review_decisions d join versions v on v.id=d.version_id),'[]'),
    'uses',coalesce((select jsonb_agg(to_jsonb(u) || jsonb_build_object('is_demo',coalesce((select p.is_demo from public.research_profiles p where p.member_id=u.member_id),false),
      'qualifies',public.research_use_qualifies(u.id) and public.research_rank(u.member_id)=rank_name)) from public.finding_usefulness u join versions v on v.id=u.version_id),'[]'),
    'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from public.finding_disputes d join versions v on v.id=d.version_id),'[]'),
    'awards',coalesce((select jsonb_agg(to_jsonb(a)) from public.award_ledger a join visible f on f.id=a.finding_id where a.member_id=p_member),'[]'),
    'personalCredit',jsonb_build_object('xp',(select coalesce(sum(xp),0) from public.award_ledger where member_id=p_member),
      'points',(select coalesce(sum(points),0) from public.award_ledger where member_id=p_member and season=(select season from public.research_policy where id))),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from public.peer_requests r join public.research_questions q on q.id=r.question_id where q.rank=rank_name),'[]'),
    'roles',coalesce((select jsonb_agg(role) from public.member_roles where member_id=p_member),'[]'),
    'policy',(select to_jsonb(p) from public.research_policy p where id),
    'assignment',(select to_jsonb(a) || jsonb_build_object(
      'version_id',case when exists(select 1 from versions v where v.id=a.version_id) then a.version_id else null end,
      'assignee_id',case when public.research_rank(a.assignee_id)=rank_name then a.assignee_id else null end)
      from public.research_assignment a where id and rank_name='Bronze'),
    'demoProfiles',coalesce((select jsonb_agg(to_jsonb(p) order by name) from public.rank_demo_profiles p where rank=rank_name),'[]'),
    'demoMessages',coalesce((select jsonb_agg(to_jsonb(m) order by sequence) from public.rank_demo_messages m join public.research_questions q on q.id=m.question_id where q.rank=rank_name),'[]'),
    'demoDelegations',coalesce((select jsonb_agg(to_jsonb(d)) from public.rank_demo_delegations d
      join public.rank_demo_profiles a on a.id=d.delegate_id join public.rank_demo_profiles o on o.id=d.owner_id
      where a.rank=rank_name and o.rank=rank_name),'[]')) into result;
  return result;
end $$;
revoke all on function public.research_snapshot_v2(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.research_snapshot_v2(uuid,uuid,text) to service_role;
commit;
