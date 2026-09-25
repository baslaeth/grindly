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
    if a.id is null or f.author_id=p_member or not exists(select 1 from public.member_roles where member_id=p_member and role='reviewer')
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
      where b.member_id=p_member and b.revoked_at is null and d.revoked_at is null) then raise exception 'research: current Silver membership required'; end if;
    insert into public.peer_requests(member_id,question_id,specialty,request)
    values(p_member,'testnet-readiness',p_data->>'specialty',p_data->>'request') returning id into item;
  elsif p_action='promote' then
    if not exists(select 1 from public.member_roles where member_id=p_member and role='steward')
      or p_member=(p_data->>'member')::uuid then raise exception 'research: independent steward required'; end if;
    select * into policy from public.research_policy where id;
    if (select coalesce(sum(xp),0) from public.award_ledger where member_id=(p_data->>'member')::uuid)<policy.silver_xp
      or (select count(*) from public.findings where author_id=(p_data->>'member')::uuid and status='accepted' and visibility='members')<policy.silver_findings
      or (select count(*) from public.finding_usefulness u join public.findings candidate on candidate.current_version=u.version_id where candidate.author_id=(p_data->>'member')::uuid and candidate.status='accepted' and candidate.visibility='members')<policy.silver_uses
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
