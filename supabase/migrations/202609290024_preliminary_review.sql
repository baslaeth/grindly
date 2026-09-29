begin;
create table public.alpha_preliminary_runs (
 id uuid primary key default gen_random_uuid(), version_id uuid not null references public.alpha_versions(version_id),
 requested_by uuid not null references public.members(id), status text not null default 'running' check(status in ('running','complete','blocked','failed')),
 provider text, model text, error_code text check(error_code in ('provider_not_approved','provider_not_configured','provider_failed','invalid_output','interrupted')),
 card jsonb, sources jsonb not null default '[]', checks jsonb not null default '[]',
 created_at timestamptz not null default now(), completed_at timestamptz,
 check(status<>'complete' or (card is not null and provider is not null and model is not null))
);
create unique index alpha_one_running_review on public.alpha_preliminary_runs(version_id) where status='running';
create unique index alpha_one_complete_review on public.alpha_preliminary_runs(version_id) where status='complete';
create table public.alpha_outcomes (
 id uuid primary key default gen_random_uuid(), version_id uuid not null references public.alpha_versions(version_id),
 actor_id uuid not null references public.members(id), status text not null check(status in ('known','mixed','inconclusive','pending')),
 facts text not null check(length(btrim(facts)) between 10 and 4000), sources jsonb not null check(jsonb_typeof(sources)='array'),
 checked_at timestamptz not null default now()
);
create function public.alpha_version_guard(p_member uuid,p_binding uuid,p_version uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare f public.findings;
begin
 select f0.* into f from public.findings f0 join public.finding_versions v on v.finding_id=f0.id where v.id=p_version;
 if f.id is null or not public.research_can_view_v2(p_member,f.id) or not public.research_compatible(p_member,f.author_id)
  then raise exception 'research: record unavailable'; end if;
 perform public.member_room_guard(p_member,p_binding,f.question_id);
 return to_jsonb(f);
end $$;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.research_snapshot_v3(p_member,p_binding,p_room);
 return s || jsonb_build_object(
 'alphas',coalesce((select jsonb_agg(to_jsonb(a)) from public.alpha_versions a where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)),'[]'),
 'preliminary',coalesce((select jsonb_agg((to_jsonb(a)-'requested_by') || jsonb_build_object('card',case when a.card is null then null else
   jsonb_set(a.card,'{priorWork}',coalesce((select jsonb_agg(x) from jsonb_array_elements(a.card->'priorWork') x
    where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=x->>'version')),'[]')) end) order by a.created_at desc)
  from public.alpha_preliminary_runs a where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)),'[]'),
 'outcomes',coalesce((select jsonb_agg(to_jsonb(a) order by a.checked_at desc) from public.alpha_outcomes a where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)),'[]'),
 'creditStates',coalesce((select jsonb_agg(to_jsonb(a)) from public.alpha_credit_states a where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)),'[]'));
end $$;
create function public.alpha_begin_review(p_member uuid,p_binding uuid,p_version uuid) returns jsonb
language plpgsql set search_path='' as $$
declare f public.findings; run public.alpha_preliminary_runs; v public.finding_versions; av public.alpha_versions; candidate jsonb; evidence_messages jsonb;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 perform pg_advisory_xact_lock(hashtextextended('alpha-review:'||p_version::text,0));
 if f.author_id<>p_member and not exists(select 1 from public.review_assignments where version_id=p_version and reviewer_id=p_member and completed_at is null)
  then raise exception 'research: author or assigned reviewer required'; end if;
 select * into v from public.finding_versions where id=p_version;
 select * into av from public.alpha_versions where version_id=p_version;
 if av.version_id is null then raise exception 'research: alpha required'; end if;
 update public.alpha_preliminary_runs set status='failed',error_code='interrupted',completed_at=now()
  where version_id=p_version and status='running' and created_at<now()-interval '2 minutes';
 select * into run from public.alpha_preliminary_runs where version_id=p_version and status in ('running','complete') order by created_at desc limit 1;
 if run.id is not null then return jsonb_build_object('existing',true,'run',run.id); end if;
 if exists(select 1 from public.alpha_preliminary_runs where version_id=p_version and created_at>now()-interval '30 seconds') then raise exception 'research: retry shortly'; end if;
 insert into public.alpha_preliminary_runs(version_id,requested_by) values(p_version,p_member) returning * into run;
 -- Candidates are visible to the submission's whole audience, not just this caller.
 select coalesce(jsonb_agg(to_jsonb(c)),'[]') into candidate from (
  select pv.id,pv.claim,pv.addition,pv.sources,pv.submitted_at,pa.subject,pa.contract,pa.category from public.finding_versions pv
  join public.findings pf on pf.current_version=pv.id join public.research_questions q on q.id=pf.question_id
  left join public.alpha_versions pa on pa.version_id=pv.id
  where q.rank=(select rank from public.research_questions where id=f.question_id) and pf.visibility='members'
   and public.research_compatible(p_member,pf.author_id) and pf.id<>f.id and pv.submitted_at<=v.submitted_at
  order by case when pa.subject=av.subject or (pa.contract<>'' and pa.contract=av.contract) then 0 else 1 end,pv.submitted_at desc limit 30
 ) c;
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'revision',r.id,'body',r.body,'createdAt',m.created_at)),'[]') into evidence_messages
 from jsonb_array_elements(av.evidence) e join public.discussion_messages m on m.id=case when e->>'kind'='message' then (e->>'value')::uuid end
 join public.chat_revisions r on r.id=case when e->>'kind'='message' then (e->>'revision')::uuid end and r.message_id=m.id;
 return jsonb_build_object('existing',false,'run',run.id,'version',to_jsonb(v),'alpha',to_jsonb(av),'candidates',candidate,'messages',evidence_messages,
  'isDemo',(select is_demo from public.research_profiles where member_id=f.author_id));
end $$;
create function public.alpha_finish_review(p_id uuid,p_status text,p_provider text default null,p_model text default null,p_card jsonb default null,p_sources jsonb default '[]',p_checks jsonb default '[]',p_error text default null) returns void
language plpgsql set search_path='' as $$
begin
 update public.alpha_preliminary_runs set status=p_status,provider=p_provider,model=p_model,card=p_card,sources=p_sources,checks=p_checks,error_code=p_error,completed_at=now()
 where id=p_id and status='running';
end $$;
create function public.alpha_run_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'research: immutable preliminary review'; end if;
 if old.status<>'running' or new.status='running' or old.version_id<>new.version_id or old.created_at<>new.created_at or old.requested_by<>new.requested_by
 then raise exception 'research: immutable preliminary review'; end if;
 return new;
end $$;
create trigger immutable_completed before update or delete on public.alpha_preliminary_runs for each row execute function public.alpha_run_immutable();
create function public.alpha_record_outcome(p_member uuid,p_binding uuid,p_version uuid,p_status text,p_facts text,p_sources jsonb) returns uuid
language plpgsql set search_path='' as $$
declare f public.findings; av public.alpha_versions; item uuid;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 select * into av from public.alpha_versions where version_id=p_version;
 if av.horizon is null or av.horizon>now() then raise exception 'research: outcome is not due'; end if;
 perform pg_advisory_xact_lock(hashtextextended('alpha-outcome:'||p_version::text,0));
 if p_status in ('known','mixed') and not exists(select 1 from public.alpha_reviewer_scopes s
   where public.alpha_authorized_reviewer(p_member,p_version,s.scope) and s.member_id=p_member and s.category=av.category)
 then raise exception 'research: independent category reviewer required'; end if;
 if p_status in ('known','mixed') and jsonb_array_length(p_sources)=0 then raise exception 'research: observed evidence required'; end if;
 if exists(select 1 from public.alpha_outcomes where version_id=p_version and checked_at>now()-interval '1 minute') then raise exception 'research: outcome was just checked'; end if;
 insert into public.alpha_outcomes(version_id,actor_id,status,facts,sources) values(p_version,p_member,p_status,p_facts,p_sources) returning id into item;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.outcome_checked',item,jsonb_build_object('status',p_status));
 return item;
end $$;
create function public.alpha_media_read(p_member uuid,p_binding uuid,p_id uuid,p_version uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare f public.findings; media public.chat_media;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 select * into media from public.chat_media where id=p_id;
 if media.id is null or not exists(select 1 from public.alpha_versions a,jsonb_array_elements(a.evidence) e
   where a.version_id=p_version and e->>'kind'='attachment' and e->>'value'=p_id::text) then raise exception 'research: media unavailable'; end if;
 perform public.member_room_guard(p_member,p_binding,media.room_id);
 return jsonb_build_object('type',media.content_type,'content',media.content_base64);
end $$;
do $$ declare t text; begin
 foreach t in array array['alpha_preliminary_runs','alpha_outcomes'] loop
 execute format('alter table public.%I enable row level security',t); execute format('alter table public.%I force row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t); execute format('grant select,insert on public.%I to service_role',t);
 end loop;
end $$;
grant update on public.alpha_preliminary_runs to service_role;
create trigger immutable_record before update or delete on public.alpha_outcomes for each row execute function public.reject_audit_changes();
revoke all on function public.alpha_version_guard(uuid,uuid,uuid),public.alpha_snapshot(uuid,uuid,text),public.alpha_begin_review(uuid,uuid,uuid),public.alpha_finish_review(uuid,text,text,text,jsonb,jsonb,jsonb,text),public.alpha_record_outcome(uuid,uuid,uuid,text,text,jsonb),public.alpha_media_read(uuid,uuid,uuid,uuid),public.alpha_run_immutable() from public,anon,authenticated;
grant execute on function public.alpha_version_guard(uuid,uuid,uuid),public.alpha_snapshot(uuid,uuid,text),public.alpha_begin_review(uuid,uuid,uuid),public.alpha_finish_review(uuid,text,text,text,jsonb,jsonb,jsonb,text),public.alpha_record_outcome(uuid,uuid,uuid,text,text,jsonb),public.alpha_media_read(uuid,uuid,uuid,uuid) to service_role;
commit;
