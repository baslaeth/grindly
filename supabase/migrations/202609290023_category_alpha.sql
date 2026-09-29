begin;
-- New submissions extend immutable versions. Existing research and roles are not rewritten.
create table public.alpha_versions (
 version_id uuid primary key references public.finding_versions(id),
 category text not null check(category in ('Whitelist Hunters','Airdrop Hunters','Presale Hunters','Degens','Traders','Project Analysts','Seed and Early Stage Investors','NFT Specialists','Meta Catchers')),
 contribution_type text not null check(contribution_type in ('find','analysis','prediction','warning','correction','followup')),
 purpose text not null check(length(btrim(purpose)) between 5 and 1000),
 subject text not null check(length(btrim(subject)) between 2 and 120),
 chain text not null default '', contract text not null default '' check(contract='' or contract ~ '^0x[0-9a-fA-F]{40}$'),
 details jsonb not null check(jsonb_typeof(details)='object'),
 evidence jsonb not null check(jsonb_typeof(evidence)='array' and jsonb_array_length(evidence) between 1 and 8),
 first_noticed timestamptz, horizon timestamptz, check_condition text not null default '',
 source_created_at timestamptz, created_at timestamptz not null default now(),
 check(contribution_type<>'prediction' or (horizon is not null and length(btrim(check_condition))>=10)),
 check(first_noticed is null or first_noticed<=created_at+interval '1 minute')
);
create table public.alpha_reviewer_scopes (
 member_id uuid references public.members(id), category text not null,
 scope text not null check(length(btrim(scope)) between 10 and 500),
 granted_by uuid not null references public.members(id), created_at timestamptz not null default now(),
 primary key(member_id,category),
 check(category in ('Whitelist Hunters','Airdrop Hunters','Presale Hunters','Degens','Traders','Project Analysts','Seed and Early Stage Investors','NFT Specialists','Meta Catchers'))
);
create table public.alpha_requests (
 member_id uuid references public.members(id), request_id uuid, payload jsonb not null,
 finding_id uuid not null references public.findings(id), version_id uuid not null references public.finding_versions(id),
 primary key(member_id,request_id)
);
create table public.alpha_credit_states (
 version_id uuid primary key references public.finding_versions(id),
 status text not null check(status in ('awarded','already_awarded','blocked_no_approved_rule'))
);
-- No production rule is inferred from illustrative P0 numbers.
create table public.alpha_award_authorizations (
 category text primary key, approved_by uuid not null references public.members(id),
 policy_evidence text not null check(length(btrim(policy_evidence))>=20), created_at timestamptz not null default now()
);
alter table public.findings drop constraint findings_status_check;
alter table public.findings add constraint findings_status_check check(status in ('pending','needs_correction','accepted','disputed','rejected'));
alter table public.review_decisions drop constraint review_decisions_decision_check;
alter table public.review_decisions add constraint review_decisions_decision_check check(decision in ('accept','correct','reject'));

-- Corrections may retain the exact original source after its chat author edits/deletes it.
create or replace function public.chat_capture_source() returns trigger
language plpgsql set search_path='' as $$
declare r public.chat_revisions; previous public.finding_versions;
begin
 if new.source_message is not null then
  perform pg_advisory_xact_lock(hashtextextended('message:'||new.source_message::text,0));
  select * into previous from public.finding_versions where id=new.previous_version;
  if previous.source_message=new.source_message and previous.source_revision=new.source_revision then return new; end if;
  select * into r from public.chat_revisions where message_id=new.source_message order by sequence desc limit 1;
  if r.deleted then raise exception 'research: source message was deleted'; end if;
  new.source_revision:=r.id;
 end if;
 return new;
end $$;

alter function public.research_can_view(uuid,uuid) rename to research_can_view_pre_alpha;
create function public.research_can_view(p_member uuid,p_finding uuid) returns boolean
language sql stable set search_path='' as $$
 select case when exists(select 1 from public.findings f join public.alpha_versions a on a.version_id=f.current_version where f.id=p_finding)
 then exists(select 1 from public.findings f join public.alpha_versions a on a.version_id=f.current_version
   where f.id=p_finding and public.research_compatible(p_member,f.author_id) and (f.visibility='members' or f.author_id=p_member
    or exists(select 1 from public.alpha_reviewer_scopes s join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
      where s.member_id=p_member and s.category=a.category)))
 else public.research_can_view_pre_alpha(p_member,p_finding) end
$$;

create function public.alpha_authorized_reviewer(p_member uuid,p_version uuid,p_scope text) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.alpha_versions a join public.finding_versions v on v.id=a.version_id
 join public.findings f on f.id=v.finding_id join public.research_questions q on q.id=f.question_id
 join public.alpha_reviewer_scopes s on s.category=a.category and s.member_id=p_member
 join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
 where v.id=p_version and s.scope=p_scope and f.author_id<>p_member
 and public.research_compatible(p_member,f.author_id) and public.research_rank(p_member)=q.rank)
$$;
alter function public.research_assign_v2(uuid,text) rename to research_assign_pre_alpha;
create function public.research_assign_v2(p_version uuid,p_kind text default 'initial') returns void
language plpgsql set search_path='' as $$
declare f public.findings; av public.alpha_versions; a public.review_assignments;
begin
 select * into av from public.alpha_versions where version_id=p_version;
 if not found then perform public.research_assign_pre_alpha(p_version,p_kind); return; end if;
 select f0.* into f from public.findings f0 join public.finding_versions v on v.finding_id=f0.id where v.id=p_version for update of f0;
 if f.current_version<>p_version or f.status not in ('pending','disputed') then return; end if;
 for a in select * from public.review_assignments where version_id=p_version and completed_at is null for update loop
   if not public.alpha_authorized_reviewer(a.reviewer_id,p_version,a.scope) or (a.kind='dispute' and (
     exists(select 1 from public.review_decisions where version_id=p_version and reviewer_id=a.reviewer_id)
     or exists(select 1 from public.finding_disputes where version_id=p_version and member_id=a.reviewer_id))) then
    update public.review_assignments set completed_at=now() where id=a.id;
    insert into public.audit_events(event_type,subject_id,details) values('alpha.assignment_invalidated',a.id,'{"reason":"authority_changed"}');
   end if;
 end loop;
 insert into public.review_assignments(version_id,reviewer_id,scope,kind)
 select p_version,s.member_id,s.scope,p_kind from public.alpha_reviewer_scopes s
 where s.category=av.category and public.alpha_authorized_reviewer(s.member_id,p_version,s.scope)
 and not exists(select 1 from public.review_assignments where version_id=p_version and completed_at is null)
 and (p_kind<>'dispute' or (not exists(select 1 from public.review_decisions where version_id=p_version and reviewer_id=s.member_id)
   and not exists(select 1 from public.finding_disputes where version_id=p_version and member_id=s.member_id)))
 order by s.member_id limit 1;
end $$;

create function public.alpha_submit(p_member uuid,p_binding uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare room text; f public.findings; v public.finding_versions; prior public.alpha_requests; e jsonb;
 profile public.research_profiles; m public.discussion_messages; r public.chat_revisions; media public.chat_media; original_time timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('research:'||p_member::text,0));
 select id into room from public.research_questions where rank=public.research_rank(p_member) and category=p_data->>'category';
 perform public.member_room_guard(p_member,p_binding,room);
 select * into prior from public.alpha_requests where member_id=p_member and request_id=p_request;
 if found then
  if prior.payload<>p_data then raise exception 'research: request conflict'; end if;
  if not public.research_can_view_v2(p_member,prior.finding_id) then raise exception 'research: record unavailable'; end if;
  return jsonb_build_object('id',prior.finding_id,'version',prior.version_id);
 end if;
 select * into profile from public.research_profiles where member_id=p_member;
 if not found then raise exception 'research: profile required'; end if;
 if p_data->>'finding' is not null then
  select * into f from public.findings where id=(p_data->>'finding')::uuid for update;
  if f.id is null or f.author_id<>p_member or not public.research_can_view_v2(p_member,f.id)
    or f.current_version is distinct from (p_data->>'previous')::uuid or f.visibility<>p_data->>'visibility'
    or f.status='disputed' or length(btrim(coalesce(p_data->>'correction','')))<10 then raise exception 'research: correction unavailable'; end if;
  room:=f.question_id;
  if exists(select 1 from public.alpha_versions where version_id=f.current_version and category<>p_data->>'category') then raise exception 'research: correction retains category'; end if;
 else
  if p_data->>'horizon' is not null and (p_data->>'horizon')::timestamptz<=now() then raise exception 'research: future horizon required'; end if;
 end if;
 if p_data->>'sourceMessage' is not null then
  perform pg_advisory_xact_lock(hashtextextended('message:'||(p_data->>'sourceMessage'),0));
  select * into m from public.discussion_messages where id=(p_data->>'sourceMessage')::uuid;
  perform public.member_room_guard(p_member,p_binding,m.question_id);
  select * into r from public.chat_revisions where message_id=m.id order by sequence desc limit 1;
  if m.id is null or not public.research_compatible(p_member,m.author_id) then raise exception 'research: source unavailable'; end if;
  if (r.deleted or r.id is distinct from (p_data->>'sourceRevision')::uuid) and not exists(select 1 from public.finding_versions old
    where old.id=f.current_version and old.source_message=m.id and old.source_revision=(p_data->>'sourceRevision')::uuid)
    then raise exception 'research: source unavailable or changed'; end if;
  original_time:=m.created_at;
 end if;
 for e in select * from jsonb_array_elements(p_data->'evidence') loop
  if e->>'kind'='attachment' then
   select * into media from public.chat_media where id=(e->>'value')::uuid;
   if media.id is null or media.member_id<>p_member or media.message_id is not null then raise exception 'research: attachment unavailable'; end if;
   perform public.member_room_guard(p_member,p_binding,media.room_id);
  elsif e->>'kind'='message' then
   select * into m from public.discussion_messages where id=(e->>'value')::uuid;
   perform public.member_room_guard(p_member,p_binding,m.question_id);
   if m.id is null or not public.research_compatible(p_member,m.author_id) or not exists(select 1 from public.chat_revisions
     where id=(e->>'revision')::uuid and message_id=m.id and not deleted) then raise exception 'research: message evidence unavailable'; end if;
  elsif e->>'kind'='link' then
   if e->>'value' !~ '^https://[^[:space:]]+$' then raise exception 'research: invalid evidence'; end if;
  elsif e->>'kind'='transaction' then
   if e->>'value' !~ '^0x[0-9a-fA-F]{64}$' then raise exception 'research: invalid transaction'; end if;
  else raise exception 'research: invalid evidence'; end if;
 end loop;
 if p_data->>'relatedVersion' is not null and not exists(select 1 from public.finding_versions rv join public.findings rf on rf.id=rv.finding_id
   where rv.id=(p_data->>'relatedVersion')::uuid and public.research_can_view_v2(p_member,rf.id) and public.research_compatible(p_member,rf.author_id)
    and (p_data->>'visibility'='reviewers' or rf.visibility='members')) then raise exception 'research: related record unavailable'; end if;
 if f.id is null then insert into public.findings(question_id,author_id,visibility) values(room,p_member,p_data->>'visibility') returning * into f; end if;
 insert into public.finding_versions(finding_id,version,previous_version,specialty,claim,sources,addition,limitations,source_message,related_version,correction,observed_at,source_revision)
 values(f.id,coalesce((select version from public.finding_versions where id=f.current_version),0)+1,f.current_version,profile.specialty,
  p_data->>'claim',(select jsonb_agg(case when item->>'kind'='link' then jsonb_build_object('url',item->>'value','label',item->>'label') else item end) from jsonb_array_elements(p_data->'evidence') item),p_data->>'addition',p_data->>'limitations',(p_data->>'sourceMessage')::uuid,(p_data->>'relatedVersion')::uuid,p_data->>'correction',
  coalesce((p_data->>'firstNoticed')::timestamptz,now()),(p_data->>'sourceRevision')::uuid) returning * into v;
 insert into public.alpha_versions(version_id,category,contribution_type,purpose,subject,chain,contract,details,evidence,first_noticed,horizon,check_condition,source_created_at)
 values(v.id,p_data->>'category',p_data->>'type',p_data->>'purpose',p_data->>'subject',p_data->>'chain',lower(p_data->>'contract'),p_data->'details',p_data->'evidence',
  (p_data->>'firstNoticed')::timestamptz,(p_data->>'horizon')::timestamptz,p_data->>'checkCondition',original_time);
 update public.review_assignments set completed_at=now() where version_id=f.current_version and completed_at is null;
 update public.findings set current_version=v.id,status='pending' where id=f.id;
 perform public.research_assign_v2(v.id);
 insert into public.alpha_requests values(p_member,p_request,p_data,f.id,v.id);
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.submitted',v.id,jsonb_build_object('category',p_data->>'category'));
 return jsonb_build_object('id',f.id,'version',v.id);
end $$;

create function public.alpha_decide(p_member uuid,p_binding uuid,p_version uuid,p_assignment uuid,p_decision text,p_reason text,p_conflicts text,p_conflict_free boolean) returns jsonb
language plpgsql set search_path='' as $$
declare f public.findings; v public.finding_versions; a public.review_assignments; av public.alpha_versions; decision uuid; policy public.research_policy; awarded uuid; credit text;
begin
 select * into v from public.finding_versions where id=p_version;
 select * into f from public.findings where id=v.finding_id for update;
 perform public.member_room_guard(p_member,p_binding,f.question_id);
 select * into av from public.alpha_versions where version_id=v.id;
 select * into a from public.review_assignments where id=p_assignment and version_id=v.id and reviewer_id=p_member for update;
 if av.version_id is null or a.id is null or not public.alpha_authorized_reviewer(p_member,v.id,a.scope)
  or not p_conflict_free or length(btrim(p_conflicts))<4 then raise exception 'research: independent category reviewer required'; end if;
 if exists(select 1 from public.review_decisions where assignment_id=a.id) then return jsonb_build_object('id',f.id,'alreadyRecorded',true); end if;
 if a.completed_at is not null or f.current_version<>v.id then raise exception 'research: stale review'; end if;
 insert into public.review_decisions(assignment_id,version_id,reviewer_id,decision,reason,conflicts,scope)
 values(a.id,v.id,p_member,p_decision,p_reason,p_conflicts,a.scope) returning id into decision;
 update public.review_assignments set completed_at=now() where id=a.id;
 update public.finding_disputes set resolved_at=now() where version_id=v.id and resolved_at is null;
 update public.findings set status=case p_decision when 'accept' then 'accepted' when 'reject' then 'rejected' else 'needs_correction' end where id=f.id;
 if p_decision='accept' then
  if coalesce((select is_demo from public.research_profiles where member_id=f.author_id),false)
   or exists(select 1 from public.alpha_award_authorizations where category=av.category) then
   select * into policy from public.research_policy where id;
   insert into public.award_ledger(finding_id,version_id,member_id,decision_id,xp,points,season)
   values(f.id,v.id,f.author_id,decision,policy.acceptance_xp,policy.acceptance_points,policy.season) on conflict(finding_id) do nothing returning id into awarded;
   credit:=case when awarded is null then 'already_awarded' else 'awarded' end;
  else credit:='blocked_no_approved_rule'; end if;
  insert into public.alpha_credit_states values(v.id,credit) on conflict(version_id) do nothing;
 end if;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.evaluated',v.id,jsonb_build_object('decision',p_decision));
 return jsonb_build_object('id',f.id,'credit',credit);
end $$;

-- Guard legacy mutation paths and direct decision/award insertion for new alpha.
create function public.alpha_review_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.alpha_versions where version_id=new.version_id) then
  if tg_table_name='review_decisions' then
   if not public.alpha_authorized_reviewer(new.reviewer_id,new.version_id,new.scope) then raise exception 'research: category scope required'; end if;
  elsif tg_table_name='award_ledger' then
   if not coalesce((select is_demo from public.research_profiles where member_id=new.member_id),false)
    and not exists(select 1 from public.alpha_versions a join public.alpha_award_authorizations p on p.category=a.category where a.version_id=new.version_id)
    then raise exception 'research: award policy missing'; end if;
  end if;
 end if;
 return new;
end $$;
create trigger alpha_scope_guard before insert on public.review_decisions for each row execute function public.alpha_review_guard();
create trigger alpha_award_guard before insert on public.award_ledger for each row execute function public.alpha_review_guard();
create function public.alpha_correction_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.alpha_versions where version_id=new.previous_version)
  and not exists(select 1 from public.alpha_versions where version_id=new.id) then raise exception 'research: use category alpha correction'; end if;
 return new;
end $$;
create constraint trigger alpha_correction_guard after insert on public.finding_versions deferrable initially deferred
for each row execute function public.alpha_correction_guard();

do $$ declare t text; begin
 foreach t in array array['alpha_versions','alpha_reviewer_scopes','alpha_requests','alpha_credit_states','alpha_award_authorizations'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select,insert on public.%I to service_role',t);
 end loop;
 foreach t in array array['alpha_versions','alpha_requests','alpha_credit_states','alpha_award_authorizations'] loop
 execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t);
 end loop;
end $$;
revoke all on function public.research_can_view(uuid,uuid),public.alpha_authorized_reviewer(uuid,uuid,text),public.research_assign_v2(uuid,text),public.alpha_submit(uuid,uuid,uuid,jsonb),public.alpha_decide(uuid,uuid,uuid,uuid,text,text,text,boolean),public.alpha_review_guard() from public,anon,authenticated;
revoke all on function public.alpha_correction_guard() from public,anon,authenticated;
grant execute on function public.research_can_view(uuid,uuid),public.alpha_authorized_reviewer(uuid,uuid,text),public.research_assign_v2(uuid,text),public.alpha_submit(uuid,uuid,uuid,jsonb),public.alpha_decide(uuid,uuid,uuid,uuid,text,text,text,boolean) to service_role;
commit;
