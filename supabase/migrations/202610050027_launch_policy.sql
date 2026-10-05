begin;
-- Launch accounting is separate from immutable historical/demo award rows.
create table public.launch_policy_versions (
  version text primary key,
  configured_at timestamptz not null default now(),
  new_alphas_per_day integer not null check(new_alphas_per_day>0),
  ordinary_xp_per_week integer not null check(ordinary_xp_per_week>0),
  enhanced_active_limit integer not null check(enhanced_active_limit>0),
  material_update_xp_per_week integer not null check(material_update_xp_per_week>0),
  awards jsonb not null check(jsonb_typeof(awards)='object'),
  upgrades jsonb not null check(jsonb_typeof(upgrades)='object')
);
insert into public.launch_policy_versions(version,new_alphas_per_day,ordinary_xp_per_week,enhanced_active_limit,material_update_xp_per_week,awards,upgrades)
values('2026-10-05.1',3,900,3,100,
 '{"work":{"actionable":50,"tested":150,"substantial":300},"prediction":{"standard":{"normal":{"met":50,"failed":-10,"reserve":0},"high":{"met":150,"failed":-50,"reserve":50}},"enhanced":{"normal":{"met":300,"failed":-60,"reserve":0},"high":{"met":900,"failed":-300,"reserve":300}}}}',
 '{"Bronze":1500,"Silver":3000,"Gold":4500,"Platinum":6000}');

-- Existing versions and decisions remain unchanged. Only new launch submissions use this record.
create table public.launch_submission_terms (
 version_id uuid primary key references public.alpha_versions(version_id),
 member_id uuid not null references public.members(id),
 policy_version text not null references public.launch_policy_versions(version),
 opportunity text not null check(length(btrim(opportunity)) between 2 and 120),
 useful_action text not null check(length(btrim(useful_action)) between 5 and 1000),
 cost_or_risk text not null check(length(btrim(cost_or_risk)) between 2 and 1000),
 context jsonb not null check(jsonb_typeof(context)='object'),
 prediction jsonb,
 prediction_validated boolean not null,
 is_new_alpha boolean not null,
 created_at timestamptz not null default now()
);
create table public.launch_xp_events (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members(id),
 finding_id uuid not null references public.findings(id),
 version_id uuid not null references public.finding_versions(id),
 policy_version text not null references public.launch_policy_versions(version),
 kind text not null check(kind in ('work','prediction','reversal')),
 xp integer not null check(xp between -1000 and 1000),
 ordinary boolean not null,
 reviewer_id uuid not null references public.members(id),
 basis_id uuid not null,
 reason text not null check(length(btrim(reason)) between 10 and 1500),
 created_at timestamptz not null default now(),
 unique(kind,basis_id),
 check(member_id<>reviewer_id)
);
create index launch_xp_member_time on public.launch_xp_events(member_id,created_at);
create table public.launch_work_levels (
 finding_id uuid primary key references public.findings(id),
 member_id uuid not null references public.members(id),
 eligible_level integer not null check(eligible_level in (0,50,150,300)),
 updated_at timestamptz not null default now()
);
create table public.launch_work_decisions (
 decision_id uuid primary key references public.review_decisions(id),
 version_id uuid not null references public.alpha_versions(version_id),
 work_class text not null check(work_class in ('none','actionable','tested','substantial')),
 requested_xp integer not null check(requested_xp>=0),
 credited_xp integer not null check(credited_xp>=0),
 reason text not null,
 created_at timestamptz not null default now()
);
create table public.launch_high_reservations (
 version_id uuid primary key references public.launch_submission_terms(version_id),
 member_id uuid not null references public.members(id),
 amount integer not null check(amount in (50,300)),
 released_at timestamptz,
 release_reason text,
 created_at timestamptz not null default now(),
 check((released_at is null and release_reason is null) or (released_at is not null and release_reason is not null))
);
create table public.launch_enhanced_approvals (
 version_id uuid primary key references public.launch_submission_terms(version_id),
 decision_id uuid not null unique references public.review_decisions(id),
 approved_at timestamptz not null default now()
);
create table public.launch_outcome_settlements (
 version_id uuid primary key references public.launch_submission_terms(version_id),
 assessment_id uuid not null unique references public.alpha_outcome_assessments(id),
 status text not null check(status in ('Met','Failed','Inconclusive','Cancelled')),
 reason text not null check(length(btrim(reason)) between 10 and 1500),
 market_evidence jsonb,
 awarded_xp integer not null,
 settled_at timestamptz not null default now()
);
create table public.launch_reversal_records (
 award_id uuid primary key references public.launch_xp_events(id),
 reversal_id uuid not null unique references public.launch_xp_events(id),
 evidence jsonb not null check(jsonb_typeof(evidence)='array'),
 created_at timestamptz not null default now()
);
-- No upgrade transaction is active. This allocation table prevents reuse when one is later implemented.
create table public.launch_upgrade_allocations (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members(id),
 contract_address text not null,
 token_id text not null,
 from_tier text not null check(from_tier in ('Bronze','Silver','Gold','Platinum')),
 to_tier text not null check(to_tier in ('Silver','Gold','Platinum','Diamond')),
 xp integer not null check(xp in (1500,3000,4500,6000)),
 promotion_id uuid not null unique references public.promotion_decisions(id),
 created_at timestamptz not null default now(),
 unique(contract_address,token_id,from_tier)
);

-- Permit incomplete predictions to be saved and shared; only validated launch terms can score.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.alpha_versions'::regclass and contype='c'
  and pg_get_constraintdef(oid) like '%contribution_type%' and pg_get_constraintdef(oid) like '%horizon%' loop
  execute format('alter table public.alpha_versions drop constraint %I',c.conname);
 end loop;
end $$;
alter table public.alpha_versions drop constraint alpha_versions_contribution_type_check;
alter table public.alpha_versions add constraint alpha_versions_contribution_type_check
 check(contribution_type in ('find','guide','analysis','prediction','warning','update','correction','followup'));

create function public.launch_context_keys(p_category text) returns text[] language sql immutable set search_path='' as $$
 select case p_category
 when 'Whitelist Hunters' then array['project','official','eligibility','action','cost','deadline','routeEvidence']
 when 'Airdrop Hunters' then array['project','network','status','testedSteps','costs','eligibility','checkpoint']
 when 'Presale Hunters' then array['official','terms','eligibility','deadline','valuation','vesting','productEvidence','downside']
 when 'Degens' then array['chain','identifier','direction','entry','target','invalidation','expiry','sourceType','catalyst','disclosure']
 when 'Traders' then array['asset','venue','direction','entry','stop','target','expiry','instrument','setup']
 when 'Project Analysts' then array['decision','product','users','official','independent','valuation','positive','risk','checkpoint']
 when 'Seed and Early Stage Investors' then array['opportunity','access','stage','terms','lockup','teamProduct','invalidation','milestone','reviewDate']
 when 'NFT Specialists' then array['collection','network','official','cost','eligibility','supply','utility','liquidity','catalyst','downside','deadline']
 when 'Meta Catchers' then array['theme','projects','earlyEvidence','whyNow','target','invalidation','horizon']
 else array[]::text[] end
$$;

create function public.launch_available_progress(p_member uuid) returns integer language sql stable set search_path='' as $$
 select coalesce((select sum(xp) from public.award_ledger where member_id=p_member),0)::integer
  +coalesce((select sum(xp) from public.launch_xp_events where member_id=p_member),0)::integer
  -coalesce((select sum(xp) from public.launch_upgrade_allocations where member_id=p_member),0)::integer
  -coalesce((select sum(amount) from public.launch_high_reservations where member_id=p_member and released_at is null),0)::integer
$$;
create function public.launch_week_start() returns timestamptz language sql stable set search_path='' as $$
 select (date_trunc('week',now() at time zone 'UTC') at time zone 'UTC')
$$;
create function public.launch_ordinary_remaining(p_member uuid) returns integer language sql stable set search_path='' as $$
 select greatest(0,(select ordinary_xp_per_week from public.launch_policy_versions where version='2026-10-05.1')
  -coalesce((select sum(xp) from public.launch_xp_events where member_id=p_member and ordinary and xp>0 and created_at>=public.launch_week_start()),0)
  -coalesce((select sum(xp) from public.award_ledger where member_id=p_member and xp>0 and created_at>=public.launch_week_start()),0))::integer
$$;

create function public.launch_submit(p_member uuid,p_binding uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare prior public.alpha_requests; t jsonb; p jsonb; k text; value text; keys text[]; valid boolean:=false;
 commitment text; class text; baseline numeric; target numeric; horizon timestamptz; amount integer; result jsonb; av public.alpha_versions;
begin
 perform pg_advisory_xact_lock(hashtextextended('launch-member:'||p_member::text,0));
 select * into prior from public.alpha_requests where member_id=p_member and request_id=p_request;
 if found then
  if prior.payload<>p_data then raise exception 'research: request conflict'; end if;
  perform public.alpha_version_guard(p_member,p_binding,prior.version_id);
  return jsonb_build_object('id',prior.finding_id,'version',prior.version_id,'alreadyRecorded',true);
 end if;
 t:=p_data->'launch';
 if jsonb_typeof(t) is distinct from 'object' or t->>'policyVersion' is distinct from '2026-10-05.1'
  or coalesce(length(btrim(t->>'opportunity')),0) not between 2 and 120
  or coalesce(length(btrim(t->>'usefulAction')),0) not between 5 and 1000
  or coalesce(length(btrim(t->>'costOrRisk')),0) not between 2 and 1000 then raise exception 'research: launch context required'; end if;
 keys:=public.launch_context_keys(p_data->>'category');
 if cardinality(keys)=0 or jsonb_typeof(t->'context') is distinct from 'object' then raise exception 'research: category context required'; end if;
 foreach k in array keys loop
  value:=btrim(t->'context'->>k);
  if jsonb_typeof(t->'context'->k) is distinct from 'string' or coalesce(length(value),0) not between 1 and 1000
   then raise exception 'research: missing launch category context'; end if;
  if lower(value) not in ('unknown','not applicable') then
   if ((p_data->>'category' in ('Whitelist Hunters','Presale Hunters','Project Analysts') and k='official')
     and value !~ '^https://[^[:space:]]+$') then raise exception 'research: official HTTPS source required'; end if;
   if k in ('deadline','reviewDate','expiry','horizon') or (k='checkpoint' and p_data->>'category'='Airdrop Hunters') then
    if value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(Z|[+-]\d{2}:\d{2})$' then raise exception 'research: UTC date required'; end if;
    perform value::timestamptz;
   end if;
   if k in ('entry','stop','target') and p_data->>'category' in ('Traders','Degens') and value !~ '^[0-9]+(\.[0-9]+)?$'
    then raise exception 'research: numeric market term required'; end if;
   if k='direction' and p_data->>'category' in ('Traders','Degens') and value not in ('long','short')
    then raise exception 'research: long or short required'; end if;
   if k='status' and p_data->>'category'='Airdrop Hunters' and value not in ('Confirmed','Speculative')
    then raise exception 'research: airdrop status must be confirmed, speculative or Unknown'; end if;
  end if;
 end loop;
 if exists(select 1 from jsonb_object_keys(t->'context') x where not x=any(keys)) then raise exception 'research: unexpected launch context'; end if;
 if p_data->>'finding' is null and p_data->>'type' not in ('correction','followup','update') and
  (select count(*) from public.launch_submission_terms where member_id=p_member and is_new_alpha and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=(select new_alphas_per_day from public.launch_policy_versions where version='2026-10-05.1')
  then raise exception 'research: three new alphas already submitted today'; end if;
 if p_data->>'type' in ('update','followup') and p_data->>'finding' is null and p_data->>'relatedVersion' is null
  then raise exception 'research: an update must link earlier work'; end if;
 if p_data->>'type'='correction' and p_data->>'finding' is null then raise exception 'research: correction needs earlier work'; end if;
 p:=t->'prediction';
 if p_data->>'type'='prediction' and jsonb_typeof(p) is distinct from 'object' then raise exception 'research: prediction terms required'; end if;
 if p is not null and jsonb_typeof(p)<>'null' then
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'research: invalid prediction terms'; end if;
  commitment:=p->>'commitment'; class:=p->>'predictionClass';
  if commitment is null or class is null or p->>'sourceType' is null
   or commitment not in ('normal','high') or class not in ('standard','enhanced')
   or p->>'sourceType' not in ('public_research','private_lead','claimed_insider','unknown')
   then raise exception 'research: prediction classification required'; end if;
  if length(btrim(coalesce(p->>'baseline','')))>2 and length(btrim(coalesce(p->>'target','')))>2
   and lower(btrim(p->>'baseline')) not in ('unknown','not applicable')
   and lower(btrim(p->>'target')) not in ('unknown','not applicable')
   and lower(btrim(p->>'baseline'))<>lower(btrim(p->>'target'))
   and length(btrim(coalesce(p->>'invalidation','')))>4 and lower(btrim(p->>'invalidation'))<>'unknown'
   and length(btrim(coalesce(p_data->>'checkCondition','')))>5 and lower(btrim(p_data->>'checkCondition'))<>'unknown'
   and p_data->>'horizon' is not null then
   horizon:=(p_data->>'horizon')::timestamptz;
   valid:=horizon>now();
  end if;
  if p_data->>'category' in ('Traders','Degens') and valid then
   -- A future price call is not scored without a registered risk/reward setup.
   valid:=p->>'direction' in ('long','short') and coalesce(p->>'entry','') ~ '^[0-9]+(\.[0-9]+)?$'
    and coalesce(p->>'stop','') ~ '^[0-9]+(\.[0-9]+)?$'
    and coalesce(p->>'baseline','') ~ '^[0-9]+(\.[0-9]+)?$'
    and coalesce(p->>'target','') ~ '^[0-9]+(\.[0-9]+)?$';
   if valid then
    baseline:=(p->>'baseline')::numeric; target:=(p->>'target')::numeric;
    valid:=baseline>0 and target>0;
   end if;
   if valid then
    if p->>'direction'='long' then valid:=(p->>'stop')::numeric<(p->>'entry')::numeric
      and target>(p->>'entry')::numeric and target-(p->>'entry')::numeric>=2*((p->>'entry')::numeric-(p->>'stop')::numeric);
    else valid:=(p->>'stop')::numeric>(p->>'entry')::numeric
      and target<(p->>'entry')::numeric and (p->>'entry')::numeric-target>=2*((p->>'stop')::numeric-(p->>'entry')::numeric); end if;
   end if;
   -- Ordered outcome settlement currently covers only completed Coinbase Exchange spot hours.
   valid:=valid and p_data->>'category'='Traders'
    and upper(btrim(p_data->>'subject')) in ('BTC','BITCOIN','BTC-USD','ETH','ETHEREUM','ETH-USD','SOL','SOL-USD')
    and upper(btrim(t->'context'->>'asset'))=upper(btrim(p_data->>'subject'))
    and lower(btrim(t->'context'->>'venue')) in ('coinbase','coinbase exchange')
    and lower(btrim(t->'context'->>'instrument'))='spot'
    and extract(minute from horizon at time zone 'UTC')=0
    and extract(second from horizon at time zone 'UTC')=0
    and horizon<=now()+interval '168 hours';
  end if;
  if class='enhanced' then
   if coalesce(p->>'startsAt','')='' then valid:=false;
   else
    begin
     valid:=valid and (p->>'startsAt')::timestamptz>now()
      and horizon>=(p->>'startsAt')::timestamptz+interval '30 days';
    exception when invalid_datetime_format or datetime_field_overflow then valid:=false;
    end;
   end if;
  end if;
 end if;
 result:=public.alpha_submit_v2(p_member,p_binding,p_request,p_data);
 select * into av from public.alpha_versions where version_id=(result->>'version')::uuid;
 insert into public.launch_submission_terms(version_id,member_id,policy_version,opportunity,useful_action,cost_or_risk,context,prediction,prediction_validated,is_new_alpha)
 values(av.version_id,p_member,'2026-10-05.1',t->>'opportunity',t->>'usefulAction',t->>'costOrRisk',t->'context',case when jsonb_typeof(p)='object' then p else null end,valid,p_data->>'finding' is null and p_data->>'type' not in ('update','followup'));
 -- The pre-launch submit path assigns before launch terms exist. Recheck under launch scope.
 perform public.research_assign_v2(av.version_id);
 if valid and commitment='high' then
  if exists(select 1 from public.promotion_decisions d where d.member_id=p_member and d.revoked_at is null
   and not exists(select 1 from public.launch_upgrade_allocations a where a.promotion_id=d.id))
   then raise exception 'research: prior NFT progression must be reconciled before a High reservation'; end if;
  select (awards#>>array['prediction',class,commitment,'reserve'])::integer into amount
   from public.launch_policy_versions where version='2026-10-05.1';
  if public.launch_available_progress(p_member)<amount then raise exception 'research: insufficient unused XP for High commitment'; end if;
  insert into public.launch_high_reservations(version_id,member_id,amount) values(av.version_id,p_member,amount);
 end if;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_member,'launch.alpha_registered',av.version_id,jsonb_build_object('policy','2026-10-05.1','validated',valid));
 return result||jsonb_build_object('predictionValidated',valid);
end $$;

-- The pre-launch decision remains an audit decision but must not mint a legacy demo award for a launch version.
alter function public.alpha_decide(uuid,uuid,uuid,uuid,text,text,text,boolean) rename to alpha_decide_pre_launch;
create function public.alpha_decide(p_member uuid,p_binding uuid,p_version uuid,p_assignment uuid,p_decision text,p_reason text,p_conflicts text,p_conflict_free boolean) returns jsonb
language plpgsql set search_path='' as $$
declare f public.findings; v public.finding_versions; a public.review_assignments; av public.alpha_versions; decision uuid;
begin
 if not exists(select 1 from public.launch_submission_terms where version_id=p_version) then
  return public.alpha_decide_pre_launch(p_member,p_binding,p_version,p_assignment,p_decision,p_reason,p_conflicts,p_conflict_free);
 end if;
 if current_setting('app.launch_decision',true) is distinct from 'on' then raise exception 'research: use launch review boundary'; end if;
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
 if p_decision='accept' and not exists(select 1 from public.launch_submission_terms where version_id=v.id) then
  insert into public.alpha_credit_states values(v.id,'blocked_no_approved_rule') on conflict(version_id) do nothing;
 end if;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.evaluated',v.id,jsonb_build_object('decision',p_decision));
 return jsonb_build_object('id',f.id,'decision',decision);
end $$;

create function public.launch_decide(p_member uuid,p_binding uuid,p_version uuid,p_assignment uuid,p_decision text,p_reason text,p_conflicts text,p_conflict_free boolean,p_checklist text,p_assessment jsonb,p_work_class text) returns jsonb
language plpgsql set search_path='' as $$
declare t public.launch_submission_terms; result jsonb; d public.review_decisions; f public.findings;
 current_level integer:=0; target_level integer:=0; requested integer:=0; paid integer:=0; prev public.launch_work_decisions;
begin
 select * into t from public.launch_submission_terms where version_id=p_version;
 if t.version_id is null then raise exception 'research: launch terms unavailable'; end if;
 if p_work_class is null or p_work_class not in ('none','actionable','tested','substantial') then raise exception 'research: work classification required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('launch-member:'||t.member_id::text,0));
 perform set_config('app.launch_decision','on',true);
 result:=public.alpha_decide_v2(p_member,p_binding,p_version,p_assignment,p_decision,p_reason,p_conflicts,p_conflict_free,p_checklist,p_assessment);
 select * into d from public.review_decisions where assignment_id=p_assignment;
 select * into prev from public.launch_work_decisions where decision_id=d.id;
 if prev.decision_id is not null then
  if prev.work_class<>p_work_class then raise exception 'research: decision already recorded'; end if;
  return result||jsonb_build_object('workXp',prev.credited_xp,'alreadyRecorded',true);
 end if;
 if p_decision<>'accept' and p_work_class<>'none' then raise exception 'research: work award requires acceptance'; end if;
 select * into f from public.findings where id=(select finding_id from public.finding_versions where id=p_version) for update;
 if p_decision='accept' then
  if p_work_class<>'none' then
   select (awards->'work'->>p_work_class)::integer into target_level
    from public.launch_policy_versions where version=t.policy_version;
  end if;
  select eligible_level into current_level from public.launch_work_levels where finding_id=f.id for update;
  current_level:=coalesce(current_level,0);
  if exists(select 1 from public.award_ledger where finding_id=f.id) then
   current_level:=greatest(current_level,300);
  end if;
  requested:=greatest(0,target_level-current_level);
  if (select contribution_type from public.alpha_versions where version_id=p_version)='correction' then requested:=0; end if;
  if (select contribution_type from public.alpha_versions where version_id=p_version)='prediction' and p_work_class<>'none'
   then raise exception 'research: a raw prediction cannot receive work XP; submit separate verified research'; end if;
  if (select contribution_type from public.alpha_versions where version_id=p_version) in ('update','followup') then
   requested:=least(requested,greatest(0,(select material_update_xp_per_week from public.launch_policy_versions where version=t.policy_version)-coalesce((select sum(xp) from public.launch_xp_events x
    join public.launch_submission_terms lt on lt.version_id=x.version_id
    where x.member_id=t.member_id and x.kind='work' and x.xp>0 and lt.opportunity=t.opportunity
     and x.created_at>=public.launch_week_start()),0)));
  end if;
  paid:=least(requested,public.launch_ordinary_remaining(t.member_id));
  insert into public.launch_work_levels(finding_id,member_id,eligible_level)
   values(f.id,t.member_id,greatest(target_level,current_level))
   on conflict(finding_id) do update set eligible_level=greatest(public.launch_work_levels.eligible_level,excluded.eligible_level),updated_at=now();
  if paid>0 then
   insert into public.launch_xp_events(member_id,finding_id,version_id,policy_version,kind,xp,ordinary,reviewer_id,basis_id,reason)
   values(t.member_id,f.id,p_version,t.policy_version,'work',paid,true,p_member,d.id,p_reason);
  end if;
  if t.prediction_validated and t.prediction->>'predictionClass'='enhanced' then
   if (t.prediction->>'startsAt')::timestamptz>now() and
    (select count(*) from public.launch_enhanced_approvals ea join public.launch_submission_terms lt on lt.version_id=ea.version_id
      where lt.member_id=t.member_id and not exists(select 1 from public.launch_outcome_settlements os where os.version_id=ea.version_id))<(select enhanced_active_limit from public.launch_policy_versions where version=t.policy_version) then
    insert into public.launch_enhanced_approvals(version_id,decision_id) values(p_version,d.id);
   else
    update public.launch_high_reservations set released_at=now(),release_reason='enhanced terms not approved'
     where version_id=p_version and released_at is null;
   end if;
  end if;
 else
  update public.launch_high_reservations set released_at=now(),release_reason='review not accepted'
  where version_id=p_version and released_at is null;
 end if;
 insert into public.launch_work_decisions(decision_id,version_id,work_class,requested_xp,credited_xp,reason)
 values(d.id,p_version,p_work_class,requested,paid,p_reason);
 return result||jsonb_build_object('workXp',paid,'workRequested',requested);
end $$;

create or replace function public.alpha_review_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.alpha_versions where version_id=new.version_id) then
  if tg_table_name='review_decisions' then
   if exists(select 1 from public.launch_submission_terms where version_id=new.version_id)
    and current_setting('app.launch_decision',true) is distinct from 'on' then raise exception 'research: use launch review boundary'; end if;
   if not public.alpha_authorized_reviewer(new.reviewer_id,new.version_id,new.scope) then raise exception 'research: category scope required'; end if;
  elsif tg_table_name='award_ledger' then
   if exists(select 1 from public.launch_submission_terms where version_id=new.version_id) then raise exception 'research: use launch XP ledger'; end if;
   if not coalesce((select is_demo from public.research_profiles where member_id=new.member_id),false)
    and not exists(select 1 from public.alpha_versions a join public.alpha_award_authorizations p on p.category=a.category where a.version_id=new.version_id)
    then raise exception 'research: award policy missing'; end if;
  end if;
 end if;
 return new;
end $$;

create function public.launch_assess_outcome(p_member uuid,p_binding uuid,p_version uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare t public.launch_submission_terms; assessment uuid; prior public.launch_outcome_settlements; f public.findings;
 class text; commitment text; delta integer:=0; paid integer:=0; status text;
begin
 select * into t from public.launch_submission_terms where version_id=p_version;
 if t.version_id is null then raise exception 'research: launch terms unavailable'; end if;
 perform pg_advisory_xact_lock(hashtextextended('launch-member:'||t.member_id::text,0));
 assessment:=public.alpha_assess_outcome(p_member,p_binding,p_version,p_request,p_data);
 select * into prior from public.launch_outcome_settlements where version_id=p_version;
 if prior.version_id is not null then
  if prior.assessment_id<>assessment then raise exception 'research: outcome already settled'; end if;
  return jsonb_build_object('id',assessment,'status',prior.status,'outcomeXp',prior.awarded_xp,'alreadyRecorded',true);
 end if;
 if p_data->>'launchStatus'='Cancelled' then
  if not t.prediction_validated or (select category from public.alpha_versions where version_id=p_version) not in ('Traders','Degens')
   or p_data->>'marketStatus'<>'Cancelled' or p_data->>'status'<>'inconclusive' or p_data->>'relation'<>'unknown'
   then raise exception 'research: a no-trigger cancellation requires complete registered market history'; end if;
  insert into public.launch_outcome_settlements(version_id,assessment_id,status,reason,market_evidence,awarded_xp)
   values(p_version,assessment,'Cancelled',p_data->>'explanation',p_data->'marketEvidence',0);
  update public.launch_high_reservations set released_at=now(),release_reason='no entry trigger'
   where version_id=p_version and released_at is null;
  insert into public.audit_events(actor_member_id,event_type,subject_id,details)
   values(p_member,'launch.outcome_settled',assessment,jsonb_build_object('status','Cancelled','xp',0));
  return jsonb_build_object('id',assessment,'status','Cancelled','outcomeXp',0);
 end if;
 if p_data->>'status'<>'known' or p_data->>'relation' not in ('met','not_met') then return jsonb_build_object('id',assessment,'status','Pending','outcomeXp',0); end if;
 if not t.prediction_validated then return jsonb_build_object('id',assessment,'status','Inconclusive','outcomeXp',0,'reason','Original prediction was not validated for scoring.'); end if;
 if (select category from public.alpha_versions where version_id=p_version) in ('Traders','Degens') then
  if (p_data->>'marketStatus') is distinct from (case when p_data->>'relation'='met' then 'Met' else 'Failed' end) then
   return jsonb_build_object('id',assessment,'status','Inconclusive','outcomeXp',0,'reason','The supported historical path does not establish this price outcome in order.');
  end if;
 end if;
 select * into f from public.findings where id=(select finding_id from public.finding_versions where id=p_version);
 if not exists(select 1 from public.review_decisions where version_id=p_version and decision='accept')
  then return jsonb_build_object('id',assessment,'status','Pending','outcomeXp',0,'reason','Independent work review is pending.'); end if;
 class:=t.prediction->>'predictionClass'; commitment:=t.prediction->>'commitment';
 if class='enhanced' and not exists(select 1 from public.launch_enhanced_approvals where version_id=p_version)
  then return jsonb_build_object('id',assessment,'status','Inconclusive','outcomeXp',0,'reason','Enhanced terms were not approved before the window.'); end if;
 if commitment='high' and not exists(select 1 from public.launch_high_reservations where version_id=p_version and released_at is null)
  then raise exception 'research: High reservation missing'; end if;
 status:=case when p_data->>'relation'='met' then 'Met' else 'Failed' end;
 select (awards#>>array['prediction',class,commitment,lower(status)])::integer into delta
  from public.launch_policy_versions where version=t.policy_version;
 paid:=case when delta>0 and class='standard' then least(delta,public.launch_ordinary_remaining(t.member_id)) else delta end;
 insert into public.launch_outcome_settlements(version_id,assessment_id,status,reason,market_evidence,awarded_xp)
 values(p_version,assessment,status,p_data->>'explanation',p_data->'marketEvidence',paid);
 if paid<>0 then
  insert into public.launch_xp_events(member_id,finding_id,version_id,policy_version,kind,xp,ordinary,reviewer_id,basis_id,reason)
  values(t.member_id,f.id,p_version,t.policy_version,'prediction',paid,class='standard',p_member,assessment,p_data->>'explanation');
 end if;
 update public.launch_high_reservations set released_at=now(),release_reason='outcome settled'
 where version_id=p_version and released_at is null;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_member,'launch.outcome_settled',assessment,jsonb_build_object('status',status,'xp',paid));
 return jsonb_build_object('id',assessment,'status',status,'outcomeXp',paid);
end $$;

create function public.launch_reverse_work(p_member uuid,p_binding uuid,p_award uuid,p_reason text,p_evidence jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare award public.launch_xp_events; f public.findings; a public.alpha_versions; scoped text; prior public.launch_xp_events; item uuid; e jsonb;
begin
 select * into award from public.launch_xp_events where id=p_award for update;
 if award.id is null or award.kind<>'work' or award.xp<=0 or length(btrim(p_reason)) not between 20 and 1500
  or jsonb_typeof(p_evidence) is distinct from 'array' or jsonb_array_length(p_evidence) not between 1 and 8
  then raise exception 'research: credited work award and sourced reason required'; end if;
 perform public.alpha_version_guard(p_member,p_binding,award.version_id);
 select * into f from public.findings where id=award.finding_id;
 select * into a from public.alpha_versions where version_id=award.version_id;
 select scope into scoped from public.alpha_reviewer_scopes where member_id=p_member and category=a.category
  and public.alpha_authorized_reviewer(p_member,a.version_id,scope);
 if scoped is null or p_member=f.author_id or p_member=award.reviewer_id
  then raise exception 'research: separate independent reversal reviewer required'; end if;
 for e in select * from jsonb_array_elements(p_evidence) loop
  if jsonb_typeof(e) is distinct from 'object' or coalesce(e->>'url','') !~ '^https://[^[:space:]]+$'
   then raise exception 'research: reversal evidence source required'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended('launch-member:'||award.member_id::text,0));
 select * into prior from public.launch_xp_events where kind='reversal' and basis_id=p_award;
 if prior.id is not null then return jsonb_build_object('id',prior.id,'alreadyRecorded',true); end if;
 insert into public.launch_xp_events(member_id,finding_id,version_id,policy_version,kind,xp,ordinary,reviewer_id,basis_id,reason)
 values(award.member_id,award.finding_id,award.version_id,award.policy_version,'reversal',-award.xp,false,p_member,p_award,p_reason)
 returning id into item;
 insert into public.launch_reversal_records(award_id,reversal_id,evidence) values(p_award,item,p_evidence);
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_member,'launch.work_reversed',item,jsonb_build_object('award',p_award));
 return jsonb_build_object('id',item,'xp',-award.xp);
end $$;

alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_pre_launch;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb; personal integer; applied integer; reserved integer; xp_records jsonb; terms jsonb; settlements jsonb; activity jsonb;
begin
 s:=public.alpha_snapshot_pre_launch(p_member,p_binding,p_room);
 personal:=coalesce((select sum(x.xp) from public.launch_xp_events x where x.member_id=p_member),0);
 applied:=coalesce((select sum(a.xp) from public.launch_upgrade_allocations a where a.member_id=p_member),0);
 reserved:=coalesce((select sum(amount) from public.launch_high_reservations where member_id=p_member and released_at is null),0);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]') into xp_records from public.launch_xp_events x
  where exists(select 1 from jsonb_array_elements(s->'findings') f where f->>'id'=x.finding_id::text);
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc),'[]') into terms from public.launch_submission_terms t
  where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=t.version_id::text);
 select coalesce(jsonb_agg(to_jsonb(o) order by o.settled_at desc),'[]') into settlements from public.launch_outcome_settlements o
  where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=o.version_id::text);
 select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'finding',x.finding_id,'kind','xp','xp',x.xp,'decision',x.kind,'createdAt',x.created_at) order by x.created_at desc),'[]') into activity
  from public.launch_xp_events x where x.member_id=p_member and exists(select 1 from jsonb_array_elements(s->'findings') f where f->>'id'=x.finding_id::text);
 return s||jsonb_build_object('launchAvailable',true,'launchPolicy',(select to_jsonb(p) from public.launch_policy_versions p where version='2026-10-05.1'),
  'launchTerms',terms,'launchXp',xp_records,'launchSettlements',settlements,
  'launchAllowance',jsonb_build_object('dailyRemaining',greatest(0,(select new_alphas_per_day from public.launch_policy_versions where version='2026-10-05.1')-(select count(*) from public.launch_submission_terms where member_id=p_member and is_new_alpha and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')),'weeklyRemaining',public.launch_ordinary_remaining(p_member)),
  'launchProgress',jsonb_build_object('netPersonalXp',coalesce((s->'personalCredit'->>'xp')::integer,0)+personal,'applied',applied,'reserved',reserved,'available',coalesce((s->'personalCredit'->>'xp')::integer,0)+personal-applied-reserved,
   'unreconciledHistory',exists(select 1 from public.promotion_decisions d where d.member_id=p_member and d.revoked_at is null
    and not exists(select 1 from public.launch_upgrade_allocations a where a.promotion_id=d.id))),
  'personalCredit',jsonb_build_object('xp',coalesce((s->'personalCredit'->>'xp')::integer,0)+personal,'points',coalesce((s->'personalCredit'->>'points')::integer,0)),
  'activity',coalesce(s->'activity','[]')||activity);
end $$;

do $$ declare t text; begin
 foreach t in array array['launch_policy_versions','launch_submission_terms','launch_xp_events','launch_work_levels','launch_work_decisions','launch_high_reservations','launch_enhanced_approvals','launch_outcome_settlements','launch_reversal_records','launch_upgrade_allocations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert on public.%I to service_role',t);
 end loop;
 foreach t in array array['launch_policy_versions','launch_submission_terms','launch_xp_events','launch_work_decisions','launch_enhanced_approvals','launch_outcome_settlements','launch_reversal_records','launch_upgrade_allocations'] loop
  execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t);
 end loop;
end $$;
grant update on public.launch_work_levels,public.launch_high_reservations to service_role;
revoke all on function public.launch_context_keys(text),public.launch_available_progress(uuid),public.launch_week_start(),public.launch_ordinary_remaining(uuid),public.launch_submit(uuid,uuid,uuid,jsonb),public.launch_decide(uuid,uuid,uuid,uuid,text,text,text,boolean,text,jsonb,text),public.launch_assess_outcome(uuid,uuid,uuid,uuid,jsonb),public.launch_reverse_work(uuid,uuid,uuid,text,jsonb),public.alpha_decide(uuid,uuid,uuid,uuid,text,text,text,boolean),public.alpha_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.launch_context_keys(text),public.launch_available_progress(uuid),public.launch_week_start(),public.launch_ordinary_remaining(uuid),public.launch_submit(uuid,uuid,uuid,jsonb),public.launch_decide(uuid,uuid,uuid,uuid,text,text,text,boolean,text,jsonb,text),public.launch_assess_outcome(uuid,uuid,uuid,uuid,jsonb),public.launch_reverse_work(uuid,uuid,uuid,text,jsonb),public.alpha_decide(uuid,uuid,uuid,uuid,text,text,text,boolean),public.alpha_snapshot(uuid,uuid,text) to service_role;
commit;
