-- Research remains server-only. Identity and live NFT checks precede every RPC.
create table public.research_questions (
  id text primary key,
  title text not null,
  purpose text not null,
  gaps jsonb not null check (jsonb_typeof(gaps) = 'object')
);
insert into public.research_questions values (
  'testnet-readiness',
  'What evidence would make a Robinhood Chain testnet research task worth attempting?',
  'Combine project context, on-chain limitations and a practical participation checklist. Testnet activity is not a promise of rewards or investment returns.',
  '{"operations":"What can a participant actually do, and at what cost?","project":"Which documented capabilities and dependencies support the task?","risk":"What can testnet observations establish, and what remains unknown?"}'
);
create table public.research_profiles (
  member_id uuid primary key references public.members(id),
  display_name text not null check (length(btrim(display_name)) between 2 and 60),
  specialty text not null check (specialty in ('operations','project','risk')),
  updated_at timestamptz not null default now()
);
create table public.research_reviewer_scopes (
  member_id uuid references public.members(id),
  specialty text check (specialty in ('operations','project','risk')),
  scope text not null check (length(btrim(scope)) between 10 and 500),
  granted_by uuid not null references public.members(id),
  primary key(member_id,specialty)
);
create table public.discussion_messages (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.research_questions(id),
  author_id uuid not null references public.members(id),
  specialty text not null check (specialty in ('operations','project','risk')),
  body text not null check (length(btrim(body)) between 1 and 2000),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  reply_to uuid references public.discussion_messages(id),
  created_at timestamptz not null default now()
);
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references public.research_questions(id),
  author_id uuid not null references public.members(id),
  visibility text not null check (visibility in ('members','reviewers')),
  current_version uuid,
  status text not null default 'pending' check (status in ('pending','needs_correction','accepted','disputed')),
  created_at timestamptz not null default now()
);
create table public.finding_versions (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null references public.findings(id),
  version integer not null check (version > 0),
  previous_version uuid references public.finding_versions(id),
  specialty text not null check (specialty in ('operations','project','risk')),
  claim text not null check (length(btrim(claim)) between 10 and 1000),
  sources jsonb not null check (jsonb_typeof(sources) = 'array' and jsonb_array_length(sources) between 1 and 8),
  addition text not null check (length(btrim(addition)) between 10 and 2000),
  limitations text not null check (length(btrim(limitations)) between 5 and 1000),
  source_message uuid references public.discussion_messages(id),
  related_version uuid references public.finding_versions(id),
  correction text,
  observed_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  unique(finding_id,version),
  unique(finding_id,id)
);
alter table public.findings add constraint current_version_belongs_to_finding
  foreign key(id,current_version) references public.finding_versions(finding_id,id);
create table public.review_assignments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.finding_versions(id),
  reviewer_id uuid not null references public.members(id),
  scope text not null,
  kind text not null default 'initial' check (kind in ('initial','dispute')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_open_review on public.review_assignments(version_id) where completed_at is null;
create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.review_assignments(id),
  version_id uuid not null references public.finding_versions(id),
  reviewer_id uuid not null references public.members(id),
  decision text not null check (decision in ('accept','correct')),
  reason text not null check (length(btrim(reason)) between 10 and 1500),
  conflicts text not null check (length(btrim(conflicts)) between 4 and 500),
  scope text not null,
  created_at timestamptz not null default now()
);
create table public.research_policy (
  id boolean primary key default true check(id),
  acceptance_xp integer not null default 25 check(acceptance_xp between 0 and 1000),
  acceptance_points integer not null default 25 check(acceptance_points between 0 and 1000),
  season text not null default 'P0-demo-2026',
  silver_xp integer not null default 75 check(silver_xp >= 0),
  silver_findings integer not null default 3 check(silver_findings > 0),
  silver_uses integer not null default 1 check(silver_uses > 0)
);
insert into public.research_policy default values;
create table public.award_ledger (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid not null unique references public.findings(id),
  version_id uuid not null references public.finding_versions(id),
  member_id uuid not null references public.members(id),
  decision_id uuid not null unique references public.review_decisions(id),
  xp integer not null check(xp >= 0),
  points integer not null check(points >= 0),
  season text not null,
  created_at timestamptz not null default now()
);
create table public.finding_usefulness (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.finding_versions(id),
  member_id uuid not null references public.members(id),
  specialty text not null check(specialty in ('operations','project','risk')),
  detail text not null check(length(btrim(detail)) between 10 and 1000),
  created_at timestamptz not null default now(),
  unique(version_id,member_id)
);
create table public.finding_disputes (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.finding_versions(id),
  member_id uuid not null references public.members(id),
  reason text not null check(length(btrim(reason)) between 10 and 1500),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_open_dispute on public.finding_disputes(version_id) where resolved_at is null;
create table public.peer_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  question_id text not null references public.research_questions(id),
  specialty text not null check(specialty in ('operations','project','risk')),
  request text not null check(length(btrim(request)) between 10 and 1000),
  created_at timestamptz not null default now()
);
create table public.research_assignment (
  id boolean primary key default true check(id),
  funder text not null,
  deliverable text not null,
  terms text not null,
  rights text not null,
  dispute_route text not null,
  compensation text not null,
  funding_status text not null check(funding_status in ('unfunded','committed')),
  assignee_id uuid references public.members(id),
  version_id uuid references public.finding_versions(id),
  work_status text not null default 'open' check(work_status in ('open','claimed','submitted','accepted','needs_correction')),
  payment_status text not null default 'unfunded' check(payment_status in ('unfunded','unpaid','paid')),
  check(payment_status <> 'paid' or funding_status = 'committed')
);
insert into public.research_assignment(id,funder,deliverable,terms,rights,dispute_route,compensation,funding_status)
values(true,'Grindly P0 demonstration (no external customer)',
  'One sourced testnet participation checklist covering dependencies, cost and limitations.',
  'A Project Analyst or On-chain / Risk Analyst reviewer must accept the exact submitted version. Include at least one primary source and explicitly disclaim reward guarantees.',
  'Author retains authorship; members may reference the accepted checklist with attribution. No exclusive rights transfer.',
  'Dispute the linked contribution for an independent scoped review.',
  'Illustrative fixed fee: 10 testnet units, no monetary value. Unfunded; no payment obligation or automatic payout.',
  'unfunded');

create function public.research_can_view(p_member uuid, p_finding uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from public.findings f
    join public.finding_versions v on v.id = f.current_version
    where f.id = p_finding and (f.visibility = 'members' or f.author_id = p_member or
      exists(select 1 from public.research_reviewer_scopes s join public.member_roles r
        on r.member_id=s.member_id and r.role='reviewer'
        where s.member_id=p_member and s.specialty=v.specialty)))
$$;

create function public.research_assign(p_version uuid, p_kind text default 'initial') returns void
language plpgsql set search_path = '' as $$
begin
  insert into public.review_assignments(version_id,reviewer_id,scope,kind)
  select v.id,s.member_id,s.scope,p_kind from public.finding_versions v
  join public.findings f on f.id=v.finding_id
  join public.research_reviewer_scopes s on s.specialty=v.specialty and s.member_id<>f.author_id
  join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
  where v.id=p_version and not exists(select 1 from public.review_assignments a where a.version_id=v.id and a.completed_at is null)
    and (p_kind <> 'dispute' or (not exists(select 1 from public.review_decisions d where d.version_id=v.id and d.reviewer_id=s.member_id)
      and not exists(select 1 from public.finding_disputes d where d.version_id=v.id and d.member_id=s.member_id)))
  order by s.member_id limit 1;
end
$$;

-- One transactional mutation boundary: browser-provided actor/tier values are never used.
create function public.research_mutate(p_member uuid, p_action text, p_data jsonb) returns jsonb
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
    select * into assignment from public.research_assignment where id for update;
    select * into v from public.finding_versions where id=(p_data->>'version')::uuid;
    select * into f from public.findings where id=v.finding_id;
    if assignment.assignee_id<>p_member or assignment.assignee_id is null or f.author_id<>p_member or f.id is null or f.current_version<>v.id or f.visibility<>'members' then raise exception 'research: submit your current member-visible contribution'; end if;
    if v.specialty not in ('project','risk') then raise exception 'research: assignment requires project or risk review'; end if;
    update public.research_assignment set version_id=v.id,work_status=case when f.status='accepted' then 'accepted' else 'submitted' end where id;
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
      or (select count(*) from public.finding_usefulness u join public.findings f on f.current_version=u.version_id where f.author_id=(p_data->>'member')::uuid and f.status='accepted' and f.visibility='members')<policy.silver_uses
      then raise exception 'research: published demo prerequisites not met'; end if;
    perform 1 from public.membership_bindings where id=(p_data->>'binding')::uuid and member_id=(p_data->>'member')::uuid and revoked_at is null for update;
    if not found then raise exception 'research: current candidate binding required'; end if;
    if length(btrim(coalesce(p_data->>'reason','')))<20 then raise exception 'research: evidence assessment required'; end if;
    insert into public.promotion_decisions(member_id,membership_binding_id,chain_id,contract_address,token_id,ownership_epoch,approved_by,rationale,evidence)
    select b.member_id,b.id,b.chain_id,b.contract_address,b.token_id,b.ownership_epoch,p_member,p_data->>'reason',
      (select jsonb_agg(jsonb_build_object('version',f.current_version,'kind','accepted-research')) from public.findings f where f.author_id=b.member_id and f.status='accepted' and f.visibility='members')
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

create function public.research_snapshot(p_member uuid) returns jsonb
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
    'versions',coalesce((select jsonb_agg(to_jsonb(v) order by submitted_at,version,id) from versions v),'[]'),
    'assignments',coalesce((select jsonb_agg(to_jsonb(a)) from public.review_assignments a join versions v on v.id=a.version_id),'[]'),
    'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by created_at) from public.review_decisions d join versions v on v.id=d.version_id),'[]'),
    'uses',coalesce((select jsonb_agg(to_jsonb(u)) from public.finding_usefulness u join versions v on v.id=u.version_id),'[]'),
    'disputes',coalesce((select jsonb_agg(to_jsonb(d)) from public.finding_disputes d join versions v on v.id=d.version_id),'[]'),
    'awards',coalesce((select jsonb_agg(to_jsonb(a)) from public.award_ledger a join visible f on f.id=a.finding_id where a.member_id=p_member),'[]'),
    'requests',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from public.peer_requests r),'[]'),
    'roles',coalesce((select jsonb_agg(role) from public.member_roles where member_id=p_member),'[]'),
    'policy',(select to_jsonb(p) from public.research_policy p where id),
    'assignment',(select to_jsonb(a) from public.research_assignment a where id))
  where exists(select 1 from public.members where id=p_member)
$$;

do $$
declare t text;
begin
  foreach t in array array['research_questions','research_profiles','research_reviewer_scopes','discussion_messages','findings','finding_versions','review_assignments','review_decisions','research_policy','award_ledger','finding_usefulness','finding_disputes','peer_requests','research_assignment'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
  foreach t in array array['discussion_messages','finding_versions','review_decisions','award_ledger','finding_usefulness','peer_requests'] loop
    execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t);
    execute format('revoke update, delete on public.%I from service_role',t);
  end loop;
end
$$;
revoke all on function public.research_can_view(uuid,uuid), public.research_assign(uuid,text), public.research_mutate(uuid,text,jsonb), public.research_snapshot(uuid) from public,anon,authenticated;
grant execute on function public.research_can_view(uuid,uuid), public.research_assign(uuid,text), public.research_mutate(uuid,text,jsonb), public.research_snapshot(uuid) to service_role;
