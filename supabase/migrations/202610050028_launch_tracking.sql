begin;
create table public.launch_reviewer_scopes (
 member_id uuid not null references public.members(id),
 category text not null check(public.alpha_category(category)),
 rank text not null check(rank in ('Bronze','Silver','Gold','Platinum','Diamond')),
 scope text not null check(length(btrim(scope)) between 10 and 500),
 granted_by uuid not null references public.members(id),
 created_at timestamptz not null default now(),
 primary key(member_id,category,rank)
);
alter function public.alpha_authorized_reviewer(uuid,uuid,text) rename to alpha_authorized_reviewer_pre_launch;
create function public.alpha_authorized_reviewer(p_member uuid,p_version uuid,p_scope text) returns boolean
language sql stable set search_path='' as $$
 select case when exists(select 1 from public.launch_submission_terms where version_id=p_version)
 then public.alpha_authorized_reviewer_pre_launch(p_member,p_version,p_scope)
  and exists(select 1 from public.launch_reviewer_scopes s join public.alpha_versions a on a.version_id=p_version
   join public.finding_versions v on v.id=p_version join public.findings f on f.id=v.finding_id
   join public.research_questions q on q.id=f.question_id
   where s.member_id=p_member and s.category=a.category and s.rank=q.rank and s.scope=p_scope)
 else public.alpha_authorized_reviewer_pre_launch(p_member,p_version,p_scope) end
$$;

create function public.launch_set_reviewer(p_actor uuid,p_binding uuid,p_candidate uuid,p_category text,p_scope text,p_grant boolean) returns boolean
language plpgsql set search_path='' as $$
declare rank_name text; candidate_binding uuid; room text; v record;
begin
 rank_name:=public.research_rank(p_actor);
 select id into room from public.research_questions where rank=rank_name and category='General';
 perform public.member_room_guard(p_actor,p_binding,room);
 if not exists(select 1 from public.member_roles where member_id=p_actor and role='steward')
  or p_actor=p_candidate or not public.alpha_category(p_category) or length(btrim(p_scope)) not between 10 and 500
  then raise exception 'research: scoped independent steward required'; end if;
 if not public.research_compatible(p_actor,p_candidate) or public.research_rank(p_candidate) is distinct from rank_name
  then raise exception 'research: candidate unavailable in this rank'; end if;
 select id into candidate_binding from public.membership_bindings where member_id=p_candidate and revoked_at is null limit 1;
 if candidate_binding is null then raise exception 'research: candidate binding required'; end if;
 perform public.member_room_guard(p_candidate,candidate_binding,room);
 perform pg_advisory_xact_lock(hashtextextended('launch-reviewer:'||p_candidate::text||':'||p_category,0));
 if p_grant then
  insert into public.member_roles(member_id,role,granted_by) values(p_candidate,'reviewer',p_actor) on conflict do nothing;
  insert into public.alpha_reviewer_scopes(member_id,category,scope,granted_by) values(p_candidate,p_category,p_scope,p_actor)
   on conflict(member_id,category) do update set scope=excluded.scope,granted_by=excluded.granted_by;
  insert into public.launch_reviewer_scopes(member_id,category,rank,scope,granted_by) values(p_candidate,p_category,rank_name,p_scope,p_actor)
   on conflict(member_id,category,rank) do update set scope=excluded.scope,granted_by=excluded.granted_by,created_at=now();
 else
  delete from public.launch_reviewer_scopes where member_id=p_candidate and category=p_category and rank=rank_name;
  if not exists(select 1 from public.launch_reviewer_scopes where member_id=p_candidate and category=p_category)
   then delete from public.alpha_reviewer_scopes where member_id=p_candidate and category=p_category; end if;
 end if;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_actor,case when p_grant then 'launch.reviewer_granted' else 'launch.reviewer_revoked' end,p_candidate,
  jsonb_build_object('category',p_category,'rank',rank_name,'scope',p_scope));
 for v in select f.current_version from public.findings f join public.research_questions q on q.id=f.question_id
  join public.alpha_versions a on a.version_id=f.current_version
  join public.launch_submission_terms t on t.version_id=a.version_id
  where q.rank=rank_name and a.category=p_category and f.status in ('pending','disputed') and public.research_compatible(p_actor,f.author_id)
 loop perform public.research_assign_v2(v.current_version); end loop;
 return true;
end $$;

create table public.launch_follows (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members(id),
 opportunity_id uuid references public.opportunities(id),
 finding_id uuid references public.findings(id),
 participated boolean not null default false,
 note text not null default '' check(length(note)<=500),
 next_action text not null default '' check(length(next_action)<=500),
 deadline timestamptz,
 acknowledged_at timestamptz,
 done_at timestamptz,
 removed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((opportunity_id is null)<>(finding_id is null))
);
create unique index launch_follow_one_opportunity on public.launch_follows(member_id,opportunity_id) where opportunity_id is not null;
create unique index launch_follow_one_finding on public.launch_follows(member_id,finding_id) where finding_id is not null;
create table public.launch_watch_preferences (
 member_id uuid primary key references public.members(id),
 reminders boolean not null default true,
 nonurgent_digest boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.launch_monitor_sources (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.opportunities(id),
 url text not null check(url ~ '^https://[^[:space:]]+$'),
 cadence_hours integer not null default 24 check(cadence_hours between 1 and 168),
 enabled boolean not null default false,
 next_due timestamptz not null default now(),
 last_success_at timestamptz,
 last_digest text,
 last_status text not null default 'not_checked' check(last_status in ('not_checked','no_new_confirmed_event','source_unavailable','change_queued')),
 configured_by uuid not null references public.members(id),
 created_at timestamptz not null default now(),
 unique(opportunity_id,url)
);
create table public.launch_monitor_runs (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.launch_monitor_sources(id),
 status text not null check(status in ('retrieved','source_unavailable')),
 digest text,
 checked_at timestamptz not null default now(),
 source_date timestamptz,
 detail text not null check(length(detail)<=500)
);
create table public.launch_monitor_events (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.launch_monitor_sources(id),
 opportunity_id uuid not null references public.opportunities(id),
 digest text not null,
 source_url text not null,
 source_date timestamptz,
 detected_at timestamptz not null default now(),
 confirmed_at timestamptz,
 confirmed_by uuid references public.members(id),
 status text not null default 'needs_verification' check(status in ('needs_verification','confirmed','dismissed')),
 priority text not null default 'urgent' check(priority in ('urgent','nonurgent')),
 change text,
 required_action text,
 deadline timestamptz,
 unique(source_id,digest),
 check((status='confirmed')=(confirmed_at is not null))
);
create table public.launch_notifications (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.members(id),
 follow_id uuid not null references public.launch_follows(id),
 event_id uuid references public.launch_monitor_events(id),
 kind text not null check(kind in ('material_change','deadline')),
 title text not null check(length(title) between 3 and 150),
 detail text not null check(length(detail) between 5 and 1000),
 status text not null default 'unread' check(status in ('unread','acknowledged','done')),
 created_at timestamptz not null default now(),
 delivered_at timestamptz,
 batch_at timestamptz,
 acknowledged_at timestamptz,
 done_at timestamptz,
 unique(member_id,event_id,kind)
);
create unique index launch_notification_deadline_once on public.launch_notifications(member_id,follow_id,kind) where kind='deadline';

create function public.launch_follow_mutate(p_member uuid,p_binding uuid,p_kind text,p_id uuid,p_action text,p_note text default '',p_next text default '',p_deadline timestamptz default null) returns jsonb
language plpgsql set search_path='' as $$
declare o public.opportunities; f public.findings; q public.research_questions; item public.launch_follows; room text;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_member) and category='General';
 perform public.member_room_guard(p_member,p_binding,room);
 if p_kind='opportunity' then
  select * into o from public.opportunities where id=p_id and public_visible and status<>'draft';
  if o.id is null or o.is_demo<>coalesce((select is_demo from public.research_profiles where member_id=p_member),false)
   then raise exception 'research: opportunity unavailable'; end if;
 elsif p_kind='alpha' then
  select * into f from public.findings where id=p_id;
  select * into q from public.research_questions where id=f.question_id;
  if f.id is null or q.rank is distinct from public.research_rank(p_member) or not public.research_can_view_v2(p_member,f.id)
   or not public.research_compatible(p_member,f.author_id) then raise exception 'research: alpha unavailable'; end if;
  perform public.member_room_guard(p_member,p_binding,f.question_id);
 else raise exception 'research: unsupported follow target'; end if;
 if p_action='remove' then
  update public.launch_follows set removed_at=now(),updated_at=now() where member_id=p_member and ((p_kind='opportunity' and opportunity_id=p_id) or (p_kind='alpha' and finding_id=p_id));
  return jsonb_build_object('removed',true);
 end if;
 if p_action not in ('follow','participated','update','acknowledge','done') or length(p_note)>500 or length(p_next)>500
  then raise exception 'research: invalid watch action'; end if;
 insert into public.launch_follows(member_id,opportunity_id,finding_id,participated,note,next_action,deadline)
 values(p_member,case when p_kind='opportunity' then p_id end,case when p_kind='alpha' then p_id end,
  p_action='participated',p_note,p_next,coalesce(p_deadline,o.ends_at))
 on conflict do nothing;
 select * into item from public.launch_follows where member_id=p_member and ((p_kind='opportunity' and opportunity_id=p_id) or (p_kind='alpha' and finding_id=p_id)) for update;
 update public.launch_follows set participated=item.participated or p_action='participated',
  note=case when p_action in ('participated','update') then p_note else item.note end,
  next_action=case when p_action in ('participated','update') then p_next else item.next_action end,
  deadline=coalesce(p_deadline,item.deadline),acknowledged_at=case when p_action='acknowledge' then now() else item.acknowledged_at end,
  done_at=case when p_action='done' then now() else item.done_at end,removed_at=null,updated_at=now() where id=item.id;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_member,'launch.watch_'||p_action,item.id,jsonb_build_object('target',p_kind));
 return jsonb_build_object('id',item.id,'action',p_action);
end $$;

create function public.launch_monitor_ingest(p_source uuid,p_status text,p_digest text,p_source_date timestamptz,p_detail text) returns jsonb
language plpgsql set search_path='' as $$
declare s public.launch_monitor_sources; run_id uuid; event_id uuid;
begin
 select * into s from public.launch_monitor_sources where id=p_source and enabled and next_due<=now() for update;
 if s.id is null then raise exception 'research: monitor source not due'; end if;
 if p_status not in ('retrieved','source_unavailable') or length(p_detail)>500 or (p_status='retrieved' and p_digest !~ '^[0-9a-f]{64}$')
  then raise exception 'research: invalid monitor observation'; end if;
 insert into public.launch_monitor_runs(source_id,status,digest,source_date,detail) values(p_source,p_status,p_digest,p_source_date,p_detail) returning id into run_id;
 if p_status='source_unavailable' then
  update public.launch_monitor_sources set next_due=now()+make_interval(hours=>cadence_hours),last_status='source_unavailable' where id=p_source;
  return jsonb_build_object('run',run_id,'status','source_unavailable');
 end if;
 if s.last_digest is not null and s.last_digest<>p_digest then
  insert into public.launch_monitor_events(source_id,opportunity_id,digest,source_url,source_date)
  values(s.id,s.opportunity_id,p_digest,s.url,p_source_date) on conflict(source_id,digest) do nothing returning id into event_id;
 end if;
 update public.launch_monitor_sources set next_due=now()+make_interval(hours=>cadence_hours),last_success_at=now(),last_digest=p_digest,
  last_status=case when event_id is null then 'no_new_confirmed_event' else 'change_queued' end where id=p_source;
 return jsonb_build_object('run',run_id,'status',case when event_id is null then 'no_new_confirmed_event' else 'change_queued' end,'event',event_id);
end $$;

create function public.launch_set_monitor_source(p_actor uuid,p_binding uuid,p_opportunity uuid,p_url text,p_cadence integer,p_enabled boolean) returns uuid
language plpgsql set search_path='' as $$
declare o public.opportunities; room text; item uuid;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_actor) and category='General';
 perform public.member_room_guard(p_actor,p_binding,room);
 if not exists(select 1 from public.member_roles where member_id=p_actor and role='steward')
  then raise exception 'research: steward required'; end if;
 select * into o from public.opportunities where id=p_opportunity;
 if o.id is null or o.is_demo<>coalesce((select is_demo from public.research_profiles where member_id=p_actor),false)
  or p_url !~ '^https://[^[:space:]]+$' or p_cadence not between 1 and 168
  then raise exception 'research: monitor configuration unavailable'; end if;
 insert into public.launch_monitor_sources(opportunity_id,url,cadence_hours,enabled,configured_by)
 values(p_opportunity,p_url,p_cadence,p_enabled,p_actor)
 on conflict(opportunity_id,url) do update set cadence_hours=excluded.cadence_hours,enabled=excluded.enabled,
  next_due=now(),configured_by=excluded.configured_by returning id into item;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_actor,'launch.monitor_configured',item,jsonb_build_object('enabled',p_enabled,'cadenceHours',p_cadence));
 return item;
end $$;

create function public.launch_confirm_event(p_actor uuid,p_binding uuid,p_event uuid,p_confirm boolean,p_change text,p_action text,p_deadline timestamptz,p_priority text) returns integer
language plpgsql set search_path='' as $$
declare e public.launch_monitor_events; room text; notified integer:=0;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_actor) and category='General';
 perform public.member_room_guard(p_actor,p_binding,room);
 if not exists(select 1 from public.member_roles where member_id=p_actor and role='steward')
  then raise exception 'research: steward required'; end if;
 select * into e from public.launch_monitor_events where id=p_event for update;
 if e.id is null or e.status<>'needs_verification' then raise exception 'research: event unavailable'; end if;
 if (select is_demo from public.opportunities where id=e.opportunity_id) is distinct from
  coalesce((select is_demo from public.research_profiles where member_id=p_actor),false)
  then raise exception 'research: incompatible operator'; end if;
 if p_priority not in ('urgent','nonurgent') or (p_confirm and (length(btrim(p_change))<10 or length(btrim(p_action))<5))
  then raise exception 'research: confirmed change and action required'; end if;
 update public.launch_monitor_events set status=case when p_confirm then 'confirmed' else 'dismissed' end,
  confirmed_at=case when p_confirm then now() end,confirmed_by=p_actor,change=case when p_confirm then p_change end,
  required_action=case when p_confirm then p_action end,deadline=p_deadline,priority=p_priority where id=p_event;
 if p_confirm then
  insert into public.launch_notifications(member_id,follow_id,event_id,kind,title,detail,delivered_at)
  select f.member_id,f.id,p_event,'material_change',o.name||' changed',p_change||' Next: '||p_action,
   case when p_priority='urgent' or not coalesce(prefs.nonurgent_digest,true) then now() end
  from public.launch_follows f join public.opportunities o on o.id=f.opportunity_id
  left join public.launch_watch_preferences prefs on prefs.member_id=f.member_id
  where f.opportunity_id=e.opportunity_id and f.done_at is null and f.removed_at is null
  on conflict do nothing;
  get diagnostics notified=row_count;
 end if;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details)
 values(p_actor,'launch.monitor_event_reviewed',p_event,jsonb_build_object('confirmed',p_confirm,'notified',notified));
 return notified;
end $$;

create function public.launch_deliver_digest() returns integer language plpgsql set search_path='' as $$
declare delivered integer; tick timestamptz:=now();
begin
 update public.launch_notifications set delivered_at=tick,batch_at=tick
 where delivered_at is null and kind='material_change' and status='unread';
 get diagnostics delivered=row_count;
 return delivered;
end $$;

create function public.launch_notification_mutate(p_member uuid,p_binding uuid,p_id uuid,p_action text) returns boolean
language plpgsql set search_path='' as $$
declare n public.launch_notifications; f public.launch_follows; room text;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_member) and category='General';
 perform public.member_room_guard(p_member,p_binding,room);
 select * into n from public.launch_notifications where id=p_id and member_id=p_member for update;
 select * into f from public.launch_follows where id=n.follow_id;
 if n.id is null or n.delivered_at is null or f.member_id<>p_member or p_action not in ('acknowledge','done')
  or (f.finding_id is not null and not public.research_can_view_v2(p_member,f.finding_id))
  then raise exception 'research: notification unavailable'; end if;
 update public.launch_notifications set status=case when p_action='done' then 'done' else 'acknowledged' end,
  acknowledged_at=coalesce(acknowledged_at,now()),done_at=case when p_action='done' then now() else done_at end where id=p_id;
 return true;
end $$;
create function public.launch_watch_preferences_set(p_member uuid,p_binding uuid,p_reminders boolean,p_digest boolean) returns boolean
language plpgsql set search_path='' as $$
declare room text;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_member) and category='General';
 perform public.member_room_guard(p_member,p_binding,room);
 insert into public.launch_watch_preferences(member_id,reminders,nonurgent_digest) values(p_member,p_reminders,p_digest)
 on conflict(member_id) do update set reminders=excluded.reminders,nonurgent_digest=excluded.nonurgent_digest,updated_at=now();
 if not p_digest then
  update public.launch_notifications set delivered_at=now() where member_id=p_member and delivered_at is null;
 end if;
 return true;
end $$;
create function public.launch_due_reminders() returns integer language plpgsql set search_path='' as $$
declare created integer;
begin
 insert into public.launch_notifications(member_id,follow_id,kind,title,detail,delivered_at)
 select f.member_id,f.id,'deadline',coalesce(o.name,(select subject from public.alpha_versions a join public.finding_versions v on v.id=a.version_id where v.finding_id=f.finding_id order by v.version desc limit 1),'Opportunity')||' deadline',
  'A saved checkpoint is approaching. Review the original source and your next action.',now()
 from public.launch_follows f left join public.opportunities o on o.id=f.opportunity_id
 left join public.launch_watch_preferences p on p.member_id=f.member_id
 where f.deadline is not null and f.deadline between now() and now()+interval '24 hours' and f.done_at is null and f.removed_at is null
  and coalesce(p.reminders,true) and (f.opportunity_id is null or o.public_visible)
  and (f.finding_id is null or public.research_can_view_v2(f.member_id,f.finding_id))
 on conflict do nothing;
 get diagnostics created=row_count;
 return created;
end $$;

alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_pre_tracking;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.alpha_snapshot_pre_tracking(p_member,p_binding,p_room);
 return s||jsonb_build_object(
  'launchReviewable',coalesce((select jsonb_agg(v.id) from public.finding_versions v
    where exists(select 1 from jsonb_array_elements(s->'versions') x where x->>'id'=v.id::text)
     and exists(select 1 from public.alpha_reviewer_scopes sc where sc.member_id=p_member and public.alpha_authorized_reviewer(p_member,v.id,sc.scope))),'[]'),
  'launchReviewerScopes',case when exists(select 1 from public.member_roles where member_id=p_member and role='steward')
    then coalesce((select jsonb_agg(to_jsonb(r)) from public.launch_reviewer_scopes r
      where r.rank=s->'question'->>'rank' and public.research_compatible(p_member,r.member_id)),'[]') else '[]'::jsonb end,
  'monitorQueue',case when exists(select 1 from public.member_roles where member_id=p_member and role='steward')
    then coalesce((select jsonb_agg(to_jsonb(e)||jsonb_build_object('opportunityName',o.name) order by e.detected_at) from public.launch_monitor_events e
      join public.opportunities o on o.id=e.opportunity_id where e.status='needs_verification'
       and o.is_demo=coalesce((select is_demo from public.research_profiles where member_id=p_member),false)),'[]') else '[]'::jsonb end,
  'operatorOpportunities',case when exists(select 1 from public.member_roles where member_id=p_member and role='steward')
    then coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'isDemo',o.is_demo)) from public.opportunities o
      where o.public_visible and o.is_demo=coalesce((select is_demo from public.research_profiles where member_id=p_member),false)),'[]') else '[]'::jsonb end,
  'operatorMonitorSources',case when exists(select 1 from public.member_roles where member_id=p_member and role='steward')
    then coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from public.launch_monitor_sources m
      join public.opportunities o on o.id=m.opportunity_id
      where o.is_demo=coalesce((select is_demo from public.research_profiles where member_id=p_member),false)),'[]') else '[]'::jsonb end,
  'follows',coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('opportunityName',(select o.name from public.opportunities o where o.id=f.opportunity_id)) order by f.updated_at desc) from public.launch_follows f
    where f.member_id=p_member and f.removed_at is null and ((f.opportunity_id is not null and exists(select 1 from public.opportunities o where o.id=f.opportunity_id and o.public_visible and o.status<>'draft')) or exists(select 1 from jsonb_array_elements(s->'findings') v where v->>'id'=f.finding_id::text))),'[]'),
  'notifications',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object('sourceUrl',(select e.source_url from public.launch_monitor_events e where e.id=n.event_id and e.status='confirmed'),'sourceDate',(select e.source_date from public.launch_monitor_events e where e.id=n.event_id and e.status='confirmed')) order by n.created_at desc) from public.launch_notifications n
    join public.launch_follows f on f.id=n.follow_id where n.member_id=p_member and n.delivered_at is not null and f.removed_at is null and ((f.opportunity_id is not null and exists(select 1 from public.opportunities o where o.id=f.opportunity_id and o.public_visible and o.status<>'draft')) or exists(select 1 from jsonb_array_elements(s->'findings') v where v->>'id'=f.finding_id::text))),'[]'),
  'watchCoverage',coalesce((select jsonb_agg(jsonb_build_object('opportunity',m.opportunity_id,'lastSuccessAt',m.last_success_at,'status',m.last_status,'nextDue',m.next_due)) from public.launch_monitor_sources m
   where exists(select 1 from public.launch_follows f where f.member_id=p_member and f.opportunity_id=m.opportunity_id and f.removed_at is null)
    and exists(select 1 from public.opportunities o where o.id=m.opportunity_id and o.public_visible and o.status<>'draft')),'[]'),
  'watchPreferences',coalesce((select to_jsonb(p) from public.launch_watch_preferences p where p.member_id=p_member),'{"reminders":true,"nonurgent_digest":true}'::jsonb));
end $$;

do $$ declare t text; begin
 foreach t in array array['launch_reviewer_scopes','launch_follows','launch_watch_preferences','launch_monitor_sources','launch_monitor_runs','launch_monitor_events','launch_notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to service_role',t);
 end loop;
 foreach t in array array['launch_monitor_runs'] loop
  execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t);
 end loop;
end $$;
revoke all on function public.alpha_authorized_reviewer(uuid,uuid,text),public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean),public.launch_follow_mutate(uuid,uuid,text,uuid,text,text,text,timestamptz),public.launch_monitor_ingest(uuid,text,text,timestamptz,text),public.launch_set_monitor_source(uuid,uuid,uuid,text,integer,boolean),public.launch_confirm_event(uuid,uuid,uuid,boolean,text,text,timestamptz,text),public.launch_notification_mutate(uuid,uuid,uuid,text),public.launch_watch_preferences_set(uuid,uuid,boolean,boolean),public.launch_due_reminders(),public.launch_deliver_digest(),public.alpha_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.alpha_authorized_reviewer(uuid,uuid,text),public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean),public.launch_follow_mutate(uuid,uuid,text,uuid,text,text,text,timestamptz),public.launch_monitor_ingest(uuid,text,text,timestamptz,text),public.launch_set_monitor_source(uuid,uuid,uuid,text,integer,boolean),public.launch_confirm_event(uuid,uuid,uuid,boolean,text,text,timestamptz,text),public.launch_notification_mutate(uuid,uuid,uuid,text),public.launch_watch_preferences_set(uuid,uuid,boolean,boolean),public.launch_due_reminders(),public.launch_deliver_digest(),public.alpha_snapshot(uuid,uuid,text) to service_role;
commit;
