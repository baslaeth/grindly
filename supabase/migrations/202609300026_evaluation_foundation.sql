begin;
-- Additive compatibility: no historical specialty, submitted version or award is rewritten.
create function public.alpha_category(p_value text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_value=any(array['Whitelist Hunters','Airdrop Hunters','Presale Hunters','Degens','Traders','Project Analysts','Seed and Early Stage Investors','NFT Specialists','Meta Catchers']),false)
$$;
do $$ declare t text; begin
 foreach t in array array['research_profiles','discussion_messages','finding_versions'] loop
  execute format('alter table public.%I drop constraint %I',t,t||'_specialty_check');
  execute format('alter table public.%I add constraint %I check(specialty in (''operations'',''project'',''risk'') or public.alpha_category(specialty))',t,t||'_specialty_check');
 end loop;
end $$;
alter table public.alpha_versions drop constraint alpha_versions_contract_check;
alter table public.alpha_versions add constraint alpha_versions_contract_check check(length(contract)<=160);
create table public.member_category_focus (
 member_id uuid primary key references public.members(id), focus text not null check(public.alpha_category(focus)), selected_at timestamptz not null default now()
);
create function public.alpha_primary_focus(p_member uuid) returns text language sql stable set search_path='' as $$
 select coalesce((select focus from public.member_category_focus where member_id=p_member),
  (select interest from public.research_profiles where member_id=p_member and interest<>'Project Analysts'))
$$;

create table public.alpha_review_versions (
 version_id uuid primary key references public.alpha_versions(version_id),
 checklist text not null check(checklist='2026-09-30.2'), identifier text not null default '',
 claims jsonb not null check(jsonb_typeof(claims)='array'),created_at timestamptz not null default now()
);
create table public.alpha_source_checks (
 id uuid primary key default gen_random_uuid(),version_id uuid not null references public.alpha_versions(version_id),
 requested_by uuid not null references public.members(id),status text not null default 'running' check(status in ('running','complete','failed')),
 sources jsonb not null default '[]',checks jsonb not null default '[]',hints jsonb not null default '[]',
 created_at timestamptz not null default now(),completed_at timestamptz
);
create unique index alpha_one_source_check on public.alpha_source_checks(version_id) where status='running';
create table public.alpha_review_assessments (
 decision_id uuid primary key references public.review_decisions(id),
 checklist text not null check(checklist='2026-09-30.2'),
 assessment jsonb not null check(jsonb_typeof(assessment)='object'),
 created_at timestamptz not null default now()
);
create function public.alpha_decide_v2(p_member uuid,p_binding uuid,p_version uuid,p_assignment uuid,p_decision text,p_reason text,p_conflicts text,p_conflict_free boolean,p_checklist text,p_assessment jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare result jsonb; d public.review_decisions; existing public.alpha_review_assessments; k text;
begin
 if p_checklist is distinct from '2026-09-30.2' or jsonb_typeof(p_assessment) is distinct from 'object' then raise exception 'research: assessment required'; end if;
 foreach k in array array['evidence','relevance','addition','limitations','alternatives'] loop
  if jsonb_typeof(p_assessment->k) is distinct from 'string' or coalesce(length(btrim(p_assessment->>k)),0) not between 10 and 600 then raise exception 'research: incomplete assessment'; end if;
 end loop;
 if (select count(*) from jsonb_object_keys(p_assessment))<>5 then raise exception 'research: invalid assessment'; end if;
 result:=public.alpha_decide(p_member,p_binding,p_version,p_assignment,p_decision,p_reason,p_conflicts,p_conflict_free);
 select * into d from public.review_decisions where assignment_id=p_assignment;
 select * into existing from public.alpha_review_assessments where decision_id=d.id;
 if d.decision<>p_decision or d.reason<>p_reason or d.conflicts<>p_conflicts or (existing.decision_id is not null and existing.assessment<>p_assessment) then raise exception 'research: decision already recorded'; end if;
 -- Legacy decisions remain immutable and do not gain a retroactive assessment.
 if not coalesce((result->>'alreadyRecorded')::boolean,false) then
  insert into public.alpha_review_assessments(decision_id,checklist,assessment) values(d.id,p_checklist,p_assessment);
 end if;
 return result;
end $$;
create table public.alpha_outcome_assessments (
 id uuid primary key default gen_random_uuid(),version_id uuid not null references public.alpha_versions(version_id),actor_id uuid not null references public.members(id),request_id uuid not null,
 status text not null check(status in ('known','mixed','inconclusive','pending')),
 relation text not null check(relation in ('met','not_met','mixed','unknown')),
 facts text not null check(length(btrim(facts)) between 10 and 3000),
 explanation text not null check(length(btrim(explanation)) between 20 and 3000),
 uncertainty text not null check(length(btrim(uncertainty)) between 5 and 1500),
 observed_at timestamptz not null,sources jsonb not null check(jsonb_typeof(sources)='array' and jsonb_array_length(sources) between 1 and 8),
 scope text not null,conflicts text not null check(length(btrim(conflicts)) between 4 and 500),
 recorded_at timestamptz not null default now(),unique(actor_id,request_id),
 check(observed_at<=recorded_at+interval '1 minute'),
 check((status='known' and relation in ('met','not_met')) or (status='mixed' and relation='mixed') or (status in ('inconclusive','pending') and relation='unknown'))
);
create function public.alpha_focus_profile(p_member uuid,p_binding uuid,p_name text,p_bio text,p_focus text) returns boolean
language plpgsql set search_path='' as $$
begin
 perform public.member_room_guard(p_member,p_binding,(select id from public.research_questions where rank=public.research_rank(p_member) and category='General'));
 if not public.alpha_category(p_focus) or length(btrim(p_name)) not between 2 and 60 or length(p_bio)>300 then raise exception 'research: profile context required'; end if;
 insert into public.research_profiles(member_id,display_name,specialty,bio,interest) values(p_member,p_name,p_focus,p_bio,p_focus)
 on conflict(member_id) do update set display_name=excluded.display_name,bio=excluded.bio,interest=excluded.interest;
 insert into public.member_category_focus(member_id,focus) values(p_member,p_focus) on conflict(member_id) do update set focus=excluded.focus,selected_at=now();
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'profile.focus_selected',p_member,jsonb_build_object('focus',p_focus));
 return true;
end $$;
create function public.alpha_context_keys(p_category text) returns text[] language sql immutable set search_path='' as $$
 select case p_category
 when 'Whitelist Hunters' then array['official','eligibility','steps','deadline']
 when 'Airdrop Hunters' then array['protocol','actions','status','costs']
 when 'Presale Hunters' then array['terms','window','eligibility','vesting']
 when 'Degens' then array['catalyst','observations','risks','position']
 when 'Traders' then array['setup','data','risk','position']
 when 'Project Analysts' then array['thesis','team','counter']
 when 'Seed and Early Stage Investors' then array['thesis','terms','diligence','milestones']
 when 'NFT Specialists' then array['mint','rights','market']
 when 'Meta Catchers' then array['pattern','signals','horizon','disprove'] else array[]::text[] end
$$;
create function public.alpha_submit_v2(p_member uuid,p_binding uuid,p_request uuid,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare k text; keys text[]; value text; result jsonb;
begin
 keys:=public.alpha_context_keys(p_data->>'category');
 if p_data->>'checklist' is distinct from '2026-09-30.2' or cardinality(keys)=0 or jsonb_typeof(p_data->'details') is distinct from 'object'
 then raise exception 'research: category context required'; end if;
 foreach k in array keys loop
  value:=btrim(p_data->'details'->>k);
  if jsonb_typeof(p_data->'details'->k) is distinct from 'string' or coalesce(length(value),0) not between 1 and 1000 then raise exception 'research: missing category context'; end if;
  if lower(value) not in ('unknown','not applicable') then
   if (k='official' or (k='terms' and p_data->>'category'='Presale Hunters')) and value !~ '^https://[^[:space:]]+$' then raise exception 'research: invalid official reference'; end if;
   if k='deadline' then perform value::timestamptz; end if;
  end if;
 end loop;
 if exists(select 1 from jsonb_object_keys(p_data->'details') x where not x=any(keys)) then raise exception 'research: unexpected category context'; end if;
 if ((coalesce(p_data->>'contract','')<>'' or p_data->>'category' in ('Degens','NFT Specialists','Airdrop Hunters')) and length(btrim(coalesce(p_data->>'chain','')))=0)
 or (p_data->>'category' in ('Degens','NFT Specialists') and length(btrim(coalesce(p_data->>'contract','')))=0) then raise exception 'research: chain and identifier context required'; end if;
 result:=public.alpha_submit(p_member,p_binding,p_request,p_data);
 insert into public.alpha_review_versions(version_id,checklist,identifier,claims)
 values((result->>'version')::uuid,'2026-09-30.2',p_data->>'contract',jsonb_build_array(jsonb_build_object('claim',p_data->>'claim','evidence',p_data->'evidence')))
 on conflict(version_id) do nothing;
 return result;
end $$;

create function public.alpha_source_context(p_member uuid,p_binding uuid,p_version uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare f public.findings; v public.finding_versions; av public.alpha_versions; candidates jsonb; messages jsonb;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 if f.author_id<>p_member and not exists(select 1 from public.alpha_reviewer_scopes s where s.member_id=p_member and public.alpha_authorized_reviewer(p_member,p_version,s.scope))
 then raise exception 'research: author or independent category reviewer required'; end if;
 select * into v from public.finding_versions where id=p_version;
 select * into av from public.alpha_versions where version_id=p_version;
 av.contract:=coalesce((select identifier from public.alpha_review_versions where version_id=p_version),av.contract);
 if av.version_id is null then raise exception 'research: category alpha required'; end if;
 -- Whole-audience permission boundary, including earlier versions, with no hidden counts.
 select coalesce(jsonb_agg(to_jsonb(c)),'[]') into candidates from (
  select pv.id,pv.claim,pv.addition,pv.sources,pv.submitted_at,pf.author_id,pa.subject,coalesce(rv.identifier,pa.contract) as contract,pa.category
  from public.finding_versions pv join public.findings pf on pf.id=pv.finding_id join public.research_questions q on q.id=pf.question_id
  left join public.alpha_versions pa on pa.version_id=pv.id
  left join public.alpha_review_versions rv on rv.version_id=pv.id
  where q.rank=(select rank from public.research_questions where id=f.question_id) and pf.visibility='members'
   and public.research_compatible(p_member,pf.author_id) and public.research_can_view_v2(p_member,pf.id)
   and pf.id<>f.id and pv.submitted_at<=v.submitted_at
  order by case when pa.subject=av.subject or (pa.contract<>'' and pa.contract=av.contract) then 0 else 1 end,pv.submitted_at desc limit 60
 ) c;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'revision',r.id,'body',r.body,'createdAt',m.created_at)),'[]') into messages
 from jsonb_array_elements(av.evidence) e join public.discussion_messages m on m.id=case when e->>'kind'='message' then (e->>'value')::uuid end
 join public.chat_revisions r on r.id=case when e->>'kind'='message' then (e->>'revision')::uuid end and r.message_id=m.id;
 return jsonb_build_object('version',to_jsonb(v),'alpha',to_jsonb(av),'candidates',candidates,'messages',messages,
 'isDemo',(select is_demo from public.research_profiles where member_id=f.author_id));
end $$;
create function public.alpha_begin_sources(p_member uuid,p_binding uuid,p_version uuid) returns jsonb
language plpgsql set search_path='' as $$
declare context jsonb; run public.alpha_source_checks;
begin
 context:=public.alpha_source_context(p_member,p_binding,p_version);
 perform pg_advisory_xact_lock(hashtextextended('alpha-sources:'||p_version::text,0));
 update public.alpha_source_checks set status='failed',completed_at=now() where version_id=p_version and status='running' and created_at<now()-interval '2 minutes';
 select * into run from public.alpha_source_checks where version_id=p_version and (status='running' or created_at>now()-interval '30 seconds') order by created_at desc limit 1;
 if run.id is not null then return jsonb_build_object('existing',true,'run',run.id); end if;
 insert into public.alpha_source_checks(version_id,requested_by) values(p_version,p_member) returning * into run;
 return context||jsonb_build_object('existing',false,'run',run.id);
end $$;
create function public.alpha_finish_sources(p_run uuid,p_status text,p_sources jsonb,p_checks jsonb,p_hints jsonb) returns void
language plpgsql set search_path='' as $$
begin
 if p_status not in ('complete','failed') or jsonb_typeof(p_sources)<>'array' or jsonb_typeof(p_checks)<>'array' or jsonb_typeof(p_hints)<>'array' then raise exception 'research: invalid source check'; end if;
 update public.alpha_source_checks set status=p_status,sources=p_sources,checks=p_checks,hints=p_hints,completed_at=now() where id=p_run and status='running';
end $$;
create trigger immutable_completed before update or delete on public.alpha_source_checks for each row execute function public.alpha_run_immutable();

create function public.alpha_assess_outcome(p_member uuid,p_binding uuid,p_version uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql set search_path='' as $$
declare f public.findings; a public.alpha_versions; scoped text; item uuid; prior public.alpha_outcome_assessments; e jsonb;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 select * into f from public.findings where id=f.id for update;
 select * into a from public.alpha_versions where version_id=p_version;
 select scope into scoped from public.alpha_reviewer_scopes where member_id=p_member and category=a.category and public.alpha_authorized_reviewer(p_member,p_version,scope);
 if scoped is null or p_data->>'conflictFree' is distinct from 'true' then raise exception 'research: independent category reviewer required'; end if;
 if a.horizon is null or a.horizon>now() then raise exception 'research: outcome is not due'; end if;
 if (p_data->>'observedAt')::timestamptz<a.created_at then raise exception 'research: observation predates claim'; end if;
 perform pg_advisory_xact_lock(hashtextextended('alpha-assessment:'||p_member::text,0));
 select * into prior from public.alpha_outcome_assessments where actor_id=p_member and request_id=p_request;
 if found then
  if prior.version_id<>p_version or prior.facts<>p_data->>'facts' or prior.status<>p_data->>'status' or prior.relation<>p_data->>'relation' or prior.explanation<>p_data->>'explanation'
   or prior.uncertainty<>p_data->>'uncertainty' or prior.sources<>p_data->'sources' or prior.observed_at<>(p_data->>'observedAt')::timestamptz or prior.conflicts<>p_data->>'conflicts'
  then raise exception 'research: request conflict'; end if;
  return prior.id;
 end if;
 for e in select * from jsonb_array_elements(p_data->'sources') loop
  if jsonb_typeof(e) is distinct from 'object' or coalesce(e->>'url','') !~ '^https://[^[:space:]]+$' or length(btrim(coalesce(e->>'label','')))=0 then raise exception 'research: observed source required'; end if;
  if e->>'publishedAt' is not null then perform (e->>'publishedAt')::timestamptz; end if;
 end loop;
 insert into public.alpha_outcome_assessments(version_id,actor_id,request_id,status,relation,facts,explanation,uncertainty,observed_at,sources,scope,conflicts)
 values(p_version,p_member,p_request,p_data->>'status',p_data->>'relation',p_data->>'facts',p_data->>'explanation',p_data->>'uncertainty',(p_data->>'observedAt')::timestamptz,p_data->'sources',scoped,p_data->>'conflicts') returning id into item;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.outcome_assessed',item,jsonb_build_object('version',p_version,'status',p_data->>'status'));
 return item;
end $$;

alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_pre_foundation;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.alpha_snapshot_pre_foundation(p_member,p_binding,p_room);
 return s||jsonb_build_object('evaluationAvailable',true,
  'reviewAssessments',coalesce((select jsonb_agg(to_jsonb(r)) from public.alpha_review_assessments r where exists(select 1 from jsonb_array_elements(s->'decisions') d where d->>'id'=r.decision_id::text)),'[]'),
  'alphas',coalesce((select jsonb_agg(a||jsonb_build_object('contract',coalesce((select identifier from public.alpha_review_versions where version_id=(a->>'version_id')::uuid),a->>'contract'))) from jsonb_array_elements(s->'alphas') a),'[]'),
  'profiles',coalesce((select jsonb_agg(p||jsonb_build_object('primary_focus',public.alpha_primary_focus((p->>'member_id')::uuid))) from jsonb_array_elements(s->'profiles') p),'[]'),
  'checklistVersions',coalesce((select jsonb_agg(to_jsonb(r)) from public.alpha_review_versions r where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=r.version_id::text)),'[]'),
  'sourceChecks',coalesce((select jsonb_agg((to_jsonb(r)-'requested_by')||jsonb_build_object('hints',coalesce((select jsonb_agg(h) from jsonb_array_elements(r.hints) h
   where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=h->>'version')),'[]')) order by r.created_at desc)
   from public.alpha_source_checks r where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=r.version_id::text)),'[]'),
  'outcomeAssessments',coalesce((select jsonb_agg(to_jsonb(r)-'request_id' order by r.recorded_at desc) from public.alpha_outcome_assessments r where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=r.version_id::text)),'[]'),
  'outcomeReviewable',coalesce((select jsonb_agg(a.version_id) from public.alpha_versions a where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)
    and exists(select 1 from public.alpha_reviewer_scopes sc where sc.member_id=p_member and sc.category=a.category and public.alpha_authorized_reviewer(p_member,a.version_id,sc.scope))),'[]'));
end $$;

alter function public.chat_snapshot(uuid,uuid,text,bigint,bigint) rename to chat_snapshot_pre_focus;
create function public.chat_snapshot(p_member uuid,p_binding uuid,p_room text,p_before bigint default null,p_after bigint default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.chat_snapshot_pre_focus(p_member,p_binding,p_room,p_before,p_after);
 return s||jsonb_build_object('messages',coalesce((select jsonb_agg(m||jsonb_build_object('focus',public.alpha_primary_focus((m->>'author')::uuid))) from jsonb_array_elements(s->'messages') m),'[]'));
end $$;

do $$ declare t text; begin
 foreach t in array array['alpha_review_versions','alpha_review_assessments','alpha_source_checks','alpha_outcome_assessments','member_category_focus'] loop
 execute format('alter table public.%I enable row level security',t); execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t); execute format('grant select,insert on public.%I to service_role',t);
 if t not in ('alpha_source_checks','member_category_focus') then execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t); end if;
 end loop;
end $$;
grant update on public.alpha_source_checks to service_role;
grant update on public.member_category_focus to service_role;
revoke all on function public.alpha_decide_v2(uuid,uuid,uuid,uuid,text,text,text,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.alpha_decide_v2(uuid,uuid,uuid,uuid,text,text,text,boolean,text,jsonb) to service_role;
revoke all on function public.alpha_primary_focus(uuid),public.chat_snapshot(uuid,uuid,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.alpha_primary_focus(uuid),public.chat_snapshot(uuid,uuid,text,bigint,bigint) to service_role;
revoke all on function public.alpha_category(text),public.alpha_focus_profile(uuid,uuid,text,text,text),public.alpha_context_keys(text),public.alpha_submit_v2(uuid,uuid,uuid,jsonb),public.alpha_source_context(uuid,uuid,uuid),public.alpha_begin_sources(uuid,uuid,uuid),public.alpha_finish_sources(uuid,text,jsonb,jsonb,jsonb),public.alpha_assess_outcome(uuid,uuid,uuid,uuid,jsonb),public.alpha_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.alpha_category(text),public.alpha_focus_profile(uuid,uuid,text,text,text),public.alpha_context_keys(text),public.alpha_submit_v2(uuid,uuid,uuid,jsonb),public.alpha_source_context(uuid,uuid,uuid),public.alpha_begin_sources(uuid,uuid,uuid),public.alpha_finish_sources(uuid,text,jsonb,jsonb,jsonb),public.alpha_assess_outcome(uuid,uuid,uuid,uuid,jsonb),public.alpha_snapshot(uuid,uuid,text) to service_role;
commit;
