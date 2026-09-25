-- QA05 remediation. No historical research or attribution is deleted.
create function public.research_compatible(p_actor uuid, p_author uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.research_profiles a join public.research_profiles b
    on a.is_demo=b.is_demo where a.member_id=p_actor and b.member_id=p_author)
$$;

create function public.research_use_qualifies(p_use uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.finding_usefulness u
    join public.finding_versions v on v.id=u.version_id
    join public.findings f on f.current_version=v.id
    where u.id=p_use and f.status='accepted' and f.visibility='members'
      and u.member_id<>f.author_id and u.specialty<>v.specialty
      and public.research_compatible(u.member_id,f.author_id))
$$;

create or replace function public.research_review_boundary() returns trigger
language plpgsql set search_path='' as $$
begin
  -- Closing an invalid assignment preserves its original attribution.
  if tg_table_name='review_assignments' and tg_op='UPDATE' then
    if old.completed_at is null and new.completed_at is not null
      and (to_jsonb(old)-'completed_at')=(to_jsonb(new)-'completed_at') then return new; end if;
  end if;
  if not exists(select 1 from public.finding_versions v join public.findings f on f.id=v.finding_id
    where v.id=new.version_id and public.research_compatible(new.reviewer_id,f.author_id)
      and f.author_id<>new.reviewer_id)
    then raise exception 'research: independent reviewer in the same demo/real boundary required'; end if;
  return new;
end
$$;

create or replace function public.research_assign(p_version uuid, p_kind text default 'initial') returns void
language plpgsql set search_path='' as $$
declare
  f public.findings;
  v public.finding_versions;
  a public.review_assignments;
begin
  select * into v from public.finding_versions where id=p_version;
  select * into f from public.findings where id=v.finding_id for update;
  if f.id is null or f.current_version<>v.id or f.status not in ('pending','disputed') then return; end if;
  for a in select * from public.review_assignments where version_id=v.id and completed_at is null for update loop
    if not exists(select 1 from public.research_reviewer_scopes s
      join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
      where s.member_id=a.reviewer_id and s.specialty=v.specialty and s.scope=a.scope
        and s.member_id<>f.author_id and public.research_compatible(s.member_id,f.author_id)
        and (a.kind<>'dispute' or (
          not exists(select 1 from public.review_decisions d where d.version_id=v.id and d.reviewer_id=s.member_id)
          and not exists(select 1 from public.finding_disputes d where d.version_id=v.id and d.member_id=s.member_id)))) then
      update public.review_assignments set completed_at=now() where id=a.id;
      insert into public.audit_events(event_type,subject_id,details)
      values('research.assignment_invalidated',a.id,jsonb_build_object('reason','review_authority_revoked','reviewer_id',a.reviewer_id,'version_id',v.id));
    end if;
  end loop;
  insert into public.review_assignments(version_id,reviewer_id,scope,kind)
  select v.id,s.member_id,s.scope,p_kind from public.research_reviewer_scopes s
  join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
  where s.specialty=v.specialty and s.member_id<>f.author_id and public.research_compatible(s.member_id,f.author_id)
    and not exists(select 1 from public.review_assignments open where open.version_id=v.id and open.completed_at is null)
    and (p_kind<>'dispute' or (
      not exists(select 1 from public.review_decisions d where d.version_id=v.id and d.reviewer_id=s.member_id)
      and not exists(select 1 from public.finding_disputes d where d.version_id=v.id and d.member_id=s.member_id)))
  order by s.member_id limit 1;
end
$$;

-- This also protects privileged, non-UI promotion insertion paths. Legacy members
-- without research profiles are genuine, never implicit demo identities.
create function public.research_promotion_boundary() returns trigger
language plpgsql set search_path='' as $$
begin
  if coalesce((select is_demo from public.research_profiles where member_id=new.approved_by),false)
    <> coalesce((select is_demo from public.research_profiles where member_id=new.member_id),false)
    then raise exception 'research: same demo/real boundary required'; end if;
  return new;
end
$$;
create trigger research_promotion_boundary before insert or update of approved_by,member_id on public.promotion_decisions
for each row execute function public.research_promotion_boundary();

revoke all on function public.research_compatible(uuid,uuid),public.research_use_qualifies(uuid),public.research_promotion_boundary() from public,anon,authenticated;
grant execute on function public.research_compatible(uuid,uuid),public.research_use_qualifies(uuid),public.research_promotion_boundary() to service_role;

-- Avoid alias collisions with the PL/pgSQL finding row variable.
create or replace function public.research_mutate(p_member uuid, p_action text, p_data jsonb) returns jsonb
language plpgsql set search_path = '' as $$
declare
  profile public.research_profiles;
  f public.findings;
  v public.finding_versions;
  a public.review_assignments;
  item uuid;
  previous uuid;
  decision uuid;
  policy public.research_policy;
  assignment public.research_assignment;
begin
  perform 1 from public.members where id=p_member;
  if not found then raise exception 'research: member required'; end if;
  -- Serialize one member's writes and cross-member review/correction transitions.
  perform pg_advisory_xact_lock(hashtextextended('research:' || p_member::text,0));
  if p_action='profile' then
    insert into public.research_profiles(member_id,display_name,specialty)
    values(p_member,p_data->>'name',p_data->>'specialty')
    on conflict(member_id) do update set display_name=excluded.display_name,specialty=excluded.specialty,updated_at=now();
    return jsonb_build_object('saved',true);
  end if;
  select * into profile from public.research_profiles where member_id=p_member;
  if not found then raise exception 'research: set your name and specialty first'; end if;
  if p_action='message' then
    if p_data->>'reply' is not null and not exists(select 1 from public.discussion_messages where id=(p_data->>'reply')::uuid and question_id='testnet-readiness') then
      raise exception 'research: reply not available'; end if;
    insert into public.discussion_messages(question_id,author_id,specialty,body,sources,reply_to)
    values('testnet-readiness',p_member,profile.specialty,p_data->>'body',p_data->'sources',(p_data->>'reply')::uuid) returning id into item;
  elsif p_action='submit' then
    if p_data->>'finding' is null then
      insert into public.findings(question_id,author_id,visibility)
      values('testnet-readiness',p_member,p_data->>'visibility') returning * into f;
    else
      select * into f from public.findings where id=(p_data->>'finding')::uuid for update;
      if not found or f.author_id<>p_member then raise exception 'research: finding not available'; end if;
      if f.current_version<>(p_data->>'previous')::uuid or p_data->>'previous' is null then raise exception 'research: stale version; reload'; end if;
      if f.visibility<>p_data->>'visibility' then raise exception 'research: corrections retain original permissions'; end if;
      if f.status='disputed' then raise exception 'research: resolve the dispute before correcting'; end if;
      if length(btrim(coalesce(p_data->>'correction',''))) < 10 then raise exception 'research: describe the correction'; end if;
    end if;
    previous:=f.current_version;
    if p_data->>'sourceMessage' is not null and not exists(select 1 from public.discussion_messages where id=(p_data->>'sourceMessage')::uuid and question_id=f.question_id) then raise exception 'research: message not available'; end if;
    if p_data->>'relatedVersion' is not null and not exists(
      select 1 from public.finding_versions rv join public.findings rf on rf.id=rv.finding_id
      where rv.id=(p_data->>'relatedVersion')::uuid and public.research_can_view(p_member,rf.id)
      and (f.visibility='reviewers' or rf.visibility='members')
    ) then raise exception 'research: related finding not available for these permissions'; end if;
    insert into public.finding_versions(finding_id,version,previous_version,specialty,claim,sources,addition,limitations,source_message,related_version,correction,observed_at)
    values(f.id,coalesce((select version from public.finding_versions where id=previous),0)+1,previous,
      p_data->>'specialty',p_data->>'claim',p_data->'sources',p_data->>'addition',p_data->>'limitations',
      (p_data->>'sourceMessage')::uuid,(p_data->>'relatedVersion')::uuid,p_data->>'correction',(p_data->>'observedAt')::timestamptz) returning * into v;
    update public.findings set current_version=v.id,status='pending' where id=f.id;
    update public.review_assignments set completed_at=now() where version_id=previous and completed_at is null;
    perform public.research_assign(v.id);
    item:=f.id;
  elsif p_action='review' then
    select finding_id into item from public.finding_versions where id=(p_data->>'version')::uuid;
    select * into f from public.findings where id=item for update;
    select * into v from public.finding_versions where id=(p_data->>'version')::uuid;
    select * into a from public.review_assignments where id=(p_data->>'assignment')::uuid and version_id=v.id and reviewer_id=p_member for update;
    if a.id is null or f.author_id=p_member or not public.research_compatible(p_member,f.author_id) or not exists(select 1 from public.member_roles where member_id=p_member and role='reviewer')
      or not exists(select 1 from public.research_reviewer_scopes where member_id=p_member and specialty=v.specialty and scope=a.scope) then raise exception 'research: assigned in-scope reviewer required'; end if;
    if exists(select 1 from public.review_decisions where assignment_id=a.id) then return jsonb_build_object('id',f.id,'alreadyRecorded',true); end if;
    if a.completed_at is not null or f.current_version<>v.id then raise exception 'research: stale review; reload'; end if;
    if p_data->>'conflictFree' is distinct from 'true' then raise exception 'research: conflict-free review required'; end if;
    insert into public.review_decisions(assignment_id,version_id,reviewer_id,decision,reason,conflicts,scope)
    values(a.id,v.id,p_member,p_data->>'decision',p_data->>'reason',p_data->>'conflicts',a.scope) returning id into decision;
    update public.review_assignments set completed_at=now() where id=a.id;
    update public.finding_disputes set resolved_at=now() where version_id=v.id and resolved_at is null;
    update public.findings set status=case when p_data->>'decision'='accept' then 'accepted' else 'needs_correction' end where id=f.id;
    if p_data->>'decision'='accept' then
      select * into policy from public.research_policy where id;
      insert into public.award_ledger(finding_id,version_id,member_id,decision_id,xp,points,season)
      values(f.id,v.id,f.author_id,decision,policy.acceptance_xp,policy.acceptance_points,policy.season)
      on conflict(finding_id) do nothing;
    end if;
    update public.research_assignment set work_status=case when p_data->>'decision'='accept' then 'accepted' else 'needs_correction' end where version_id=v.id;
    item:=f.id;
  elsif p_action='useful' or p_action='dispute' then
    select finding_id into item from public.finding_versions where id=(p_data->>'version')::uuid;
    select * into f from public.findings where id=item for update;
    select * into v from public.finding_versions where id=(p_data->>'version')::uuid;
    if f.id is null or not public.research_can_view(p_member,f.id) or f.current_version<>v.id then raise exception 'research: finding not available'; end if;
    if not public.research_compatible(p_member,f.author_id) then raise exception 'research: same demo/real boundary required'; end if;
    if p_action='useful' then
      if f.status<>'accepted' or f.author_id=p_member or profile.specialty=v.specialty then raise exception 'research: independent cross-specialty use required'; end if;
      insert into public.finding_usefulness(version_id,member_id,specialty,detail)
      values(v.id,p_member,profile.specialty,p_data->>'detail') on conflict(version_id,member_id) do nothing;
    else
      if f.status not in ('accepted','needs_correction') then raise exception 'research: only decided findings can be disputed'; end if;
      insert into public.finding_disputes(version_id,member_id,reason) values(v.id,p_member,p_data->>'reason');
      update public.findings set status='disputed' where id=f.id;
      perform public.research_assign(v.id,'dispute');
    end if;
  elsif p_action='assign' then
    if not exists(select 1 from public.member_roles where member_id=p_member and role='steward') then raise exception 'research: steward required'; end if;
    select finding_id into item from public.finding_versions where id=(p_data->>'version')::uuid;
    select * into f from public.findings where id=item for update;
    if f.id is null or f.current_version<>(p_data->>'version')::uuid or f.status not in ('pending','disputed') then raise exception 'research: no pending version'; end if;
    if not public.research_compatible(p_member,f.author_id) then raise exception 'research: same demo/real boundary required'; end if;
    perform public.research_assign(f.current_version,case when f.status='disputed' then 'dispute' else 'initial' end);
  elsif p_action='claimAssignment' then
    select * into assignment from public.research_assignment where id for update;
    if assignment.assignee_id is not null and assignment.assignee_id<>p_member then raise exception 'research: assignment already claimed'; end if;
    update public.research_assignment set assignee_id=p_member,work_status=case when assignee_id is null then 'claimed' else work_status end where id;
  elsif p_action='deliverAssignment' then
    select * into v from public.finding_versions where id=(p_data->>'version')::uuid;
    -- Match review/correction lock order so a delayed delivery cannot restore stale acceptance.
    select * into f from public.findings where id=v.finding_id for update;
    select * into assignment from public.research_assignment where id for update;
    if assignment.assignee_id<>p_member or assignment.assignee_id is null or f.author_id<>p_member or f.id is null or f.current_version<>v.id or f.visibility<>'members' then raise exception 'research: submit your current member-visible contribution'; end if;
    if v.specialty not in ('project','risk') then raise exception 'research: assignment requires project or risk review'; end if;
    update public.research_assignment set version_id=v.id,work_status=case when f.status='accepted' then 'accepted' when f.status in ('needs_correction','disputed') then 'needs_correction' else 'submitted' end where id;
  elsif p_action='peerRequest' then
    -- Server also verifies current owner/epoch and Silver with a fresh chain read.
    if not exists(select 1 from public.membership_bindings b join public.promotion_decisions d on d.membership_binding_id=b.id
      join public.member_roles r on r.member_id=d.approved_by and r.role='steward'
      where b.member_id=p_member and b.revoked_at is null and d.revoked_at is null and public.research_compatible(d.approved_by,p_member)) then raise exception 'research: current Silver membership required'; end if;
    insert into public.peer_requests(member_id,question_id,specialty,request)
    values(p_member,'testnet-readiness',p_data->>'specialty',p_data->>'request') returning id into item;
  elsif p_action='promote' then
    if not exists(select 1 from public.member_roles where member_id=p_member and role='steward')
      or p_member=(p_data->>'member')::uuid then raise exception 'research: independent steward required'; end if;
    if not public.research_compatible(p_member,(p_data->>'member')::uuid) then raise exception 'research: same demo/real boundary required'; end if;
    select * into policy from public.research_policy where id;
    if (select coalesce(sum(xp),0) from public.award_ledger where member_id=(p_data->>'member')::uuid)<policy.silver_xp
      or (select count(*) from public.findings where author_id=(p_data->>'member')::uuid and status='accepted' and visibility='members')<policy.silver_findings
      or (select count(*) from public.finding_usefulness u join public.findings candidate on candidate.current_version=u.version_id where candidate.author_id=(p_data->>'member')::uuid and candidate.status='accepted' and candidate.visibility='members' and public.research_use_qualifies(u.id))<policy.silver_uses
      then raise exception 'research: published demo prerequisites not met'; end if;
    perform 1 from public.membership_bindings where id=(p_data->>'binding')::uuid and member_id=(p_data->>'member')::uuid and revoked_at is null for update;
    if not found then raise exception 'research: current candidate binding required'; end if;
    if length(btrim(coalesce(p_data->>'reason','')))<20 then raise exception 'research: evidence assessment required'; end if;
    insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select b.member_id,b.id,b.chain_id,b.contract_address,b.token_id,b.ownership_epoch,p_member,p_data->>'reason',
      (select jsonb_agg(jsonb_build_object('version',candidate.current_version,'kind','accepted-research')) from public.findings candidate where candidate.author_id=b.member_id and candidate.status='accepted' and candidate.visibility='members')
    from public.membership_bindings b where b.id=(p_data->>'binding')::uuid
      and not exists(select 1 from public.promotion_decisions d where d.membership_binding_id=b.id and d.revoked_at is null)
    returning id into item;
  else raise exception 'research: unknown action';
  end if;
  insert into public.audit_events(actor_member_id,event_type,subject_id,details)
  values(p_member,'research.'||p_action,item,jsonb_build_object('action',p_action));
  return jsonb_build_object('id',item);
end
$$;

create or replace function public.research_snapshot(p_member uuid) returns jsonb
language sql stable set search_path = '' as $$
  with visible as (select f.* from public.findings f where public.research_can_view(p_member,f.id)),
  versions as (select v.* from public.finding_versions v join visible f on f.id=v.finding_id),
  people as (select p.* from public.research_profiles p where p.member_id=p_member
    or exists(select 1 from public.discussion_messages m where m.author_id=p.member_id)
    or exists(select 1 from visible f where f.author_id=p.member_id)
    or exists(select 1 from public.review_assignments a join versions v on v.id=a.version_id where a.reviewer_id=p.member_id)
    or exists(select 1 from public.finding_usefulness u join versions v on v.id=u.version_id where u.member_id=p.member_id)
    or exists(select 1 from public.peer_requests r where r.member_id=p.member_id))
  select jsonb_build_object(
    'question',(select to_jsonb(q) from public.research_questions q where id='testnet-readiness'),
    'profiles',coalesce((select jsonb_agg(to_jsonb(p) order by display_name) from people p),'[]'),
    'messages',coalesce((select jsonb_agg(to_jsonb(m) order by created_at,id) from public.discussion_messages m),'[]'),
    'findings',coalesce((select jsonb_agg(to_jsonb(f) order by created_at desc,id) from visible f),'[]'),
    'versions',coalesce((select jsonb_agg((to_jsonb(v) || jsonb_build_object('related_version',case when exists(select 1 from versions target where target.id=v.related_version) then v.related_version else null end)) order by submitted_at,version,id) from versions v),'[]'),
    'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from public.review_assignments a join versions v on v.id=a.version_id),'[]'),
    'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by created_at) from public.review_decisions d join versions v on v.id=d.version_id),'[]'),
    'uses',coalesce((select jsonb_agg(to_jsonb(u) || jsonb_build_object('is_demo',coalesce((select p.is_demo from public.research_profiles p where p.member_id=u.member_id),false),'qualifies',public.research_use_qualifies(u.id))) from public.finding_usefulness u join versions v on v.id=u.version_id),'[]'),
    'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from public.finding_disputes d join versions v on v.id=d.version_id),'[]'),
    'awards',coalesce((select jsonb_agg(to_jsonb(a)) from public.award_ledger a join visible f on f.id=a.finding_id where a.member_id=p_member),'[]'),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from public.peer_requests r),'[]'),
    'roles',coalesce((select jsonb_agg(role) from public.member_roles where member_id=p_member),'[]'),
    'policy',(select to_jsonb(p) from public.research_policy p where id),
    'assignment',(select to_jsonb(a) from public.research_assignment a where id))
  where exists(select 1 from public.members where id=p_member)
$$;
