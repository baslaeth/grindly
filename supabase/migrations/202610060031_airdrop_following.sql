begin;
create table public.airdrop_campaigns (
 id text primary key, project text not null, name text not null, url text not null unique,
 enabled boolean not null default true, next_due timestamptz not null default now(),
 last_success_at timestamptz, last_status text not null default 'not_checked',
 failures integer not null default 0, snapshot jsonb, digest text
);
insert into public.airdrop_campaigns(id,project,name,url) values
 ('starknet-provisions-2024','Starknet','Starknet Provisions (historical 2024)','https://www.starknet.io/blog/starknet-provisions-program/'),
 ('optimism-drop4-2024','Optimism','Optimism Drop #4 (historical 2024)','https://optimism.io/blog/drop-4-create-together-benefit-together');
create table public.airdrop_monitor_runs (
 id uuid primary key default gen_random_uuid(), campaign_id text not null references public.airdrop_campaigns(id),
 status text not null check(status in ('retrieved','unavailable')), checked_at timestamptz not null default now(),
 source_date timestamptz, snapshot jsonb, digest text
);
create table public.airdrop_events (
 id uuid primary key default gen_random_uuid(), campaign_id text not null references public.airdrop_campaigns(id),
 fingerprint text not null, kind text not null check(kind in ('announcement','eligibility','claim_open','deadline','requirements')),
 passage text not null check(length(passage) between 10 and 1200), source_url text not null, source_date timestamptz,
 announced_at timestamptz, scheduled_at timestamptz, observed_available_at timestamptz,
 detected_at timestamptz not null default now(), status text not null default 'awaiting_confirmation' check(status in ('awaiting_confirmation','confirmed','dismissed')),
 required_action text not null check(length(required_action) between 5 and 500), is_demo boolean not null default false,
 confirmed_by uuid references public.members(id), confirmed_at timestamptz,
 unique(campaign_id,fingerprint,is_demo)
);
create table public.airdrop_alert_preferences (
 follow_id uuid primary key references public.launch_follows(id), types text[] not null default array['announcement','eligibility','claim_open','deadline','requirements'],
 paused boolean not null default false,
 check(types <@ array['announcement','eligibility','claim_open','deadline','requirements']::text[])
);
create table public.airdrop_notifications (
 id uuid primary key default gen_random_uuid(), member_id uuid not null references public.members(id),
 follow_id uuid not null references public.launch_follows(id), event_id uuid not null references public.airdrop_events(id),
 status text not null default 'unread' check(status in ('unread','acknowledged','done')),
 created_at timestamptz not null default now(), acknowledged_at timestamptz, done_at timestamptz,
 unique(member_id,event_id)
);
create function public.airdrop_preferences(p_member uuid,p_binding uuid,p_follow uuid,p_types text[],p_paused boolean) returns boolean
language plpgsql set search_path='' as $$
declare f public.launch_follows;
begin
 select * into f from public.launch_follows where id=p_follow and member_id=p_member and removed_at is null;
 if f.finding_id is null then raise exception 'research: permitted alpha follow required'; end if;
 perform public.launch_follow_mutate(p_member,p_binding,'alpha',f.finding_id,'follow');
 insert into public.airdrop_alert_preferences(follow_id,types,paused) values(f.id,p_types,p_paused)
 on conflict(follow_id) do update set types=excluded.types,paused=excluded.paused;
 return true;
end $$;
create function public.airdrop_ingest(p_campaign text,p_status text,p_snapshot jsonb,p_digest text,p_source_date timestamptz,p_candidates jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare c public.airdrop_campaigns; item jsonb; created integer:=0; n integer;
begin
 select * into c from public.airdrop_campaigns where id=p_campaign and enabled and next_due<=now() for update;
 if c.id is null then raise exception 'research: campaign not due'; end if;
 if p_status not in ('retrieved','unavailable') or jsonb_array_length(p_candidates)>8 then raise exception 'research: invalid campaign observation'; end if;
 if p_status='retrieved' and (p_digest !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_snapshot)<>'object') then raise exception 'research: invalid snapshot'; end if;
 insert into public.airdrop_monitor_runs(campaign_id,status,source_date,snapshot,digest) values(c.id,p_status,p_source_date,p_snapshot,p_digest);
 if p_status='retrieved' and c.snapshot is not null and c.digest is distinct from p_digest then
  for item in select value from jsonb_array_elements(p_candidates) loop
   if not exists(select 1 from jsonb_array_elements(p_snapshot->'passages') q where q->>'text'=item->>'passage') then raise exception 'research: event quotation absent'; end if;
   insert into public.airdrop_events(campaign_id,fingerprint,kind,passage,source_url,source_date,announced_at,scheduled_at,required_action)
    values(c.id,md5(lower(regexp_replace(item->>'passage','\s+',' ','g'))),item->>'type',item->>'passage',c.url,p_source_date,p_source_date,
     nullif(item->>'scheduledAt','')::timestamptz,item->>'action') on conflict do nothing;
   get diagnostics n=row_count; created:=created+n;
  end loop;
 end if;
 update public.airdrop_campaigns set last_status=case when p_status='unavailable' then 'unavailable' when exists(select 1 from public.airdrop_events where campaign_id=c.id and status='awaiting_confirmation' and not is_demo) then 'awaiting_confirmation' else 'no_confirmed_change' end,
  last_success_at=case when p_status='retrieved' then now() else last_success_at end,
  snapshot=case when p_status='retrieved' then p_snapshot else snapshot end,digest=case when p_status='retrieved' then p_digest else digest end,
  failures=case when p_status='retrieved' then 0 else failures+1 end,
  next_due=now()+make_interval(hours=>case when p_status='unavailable' then least(168,24*(failures+1))
   when exists(select 1 from public.airdrop_events where campaign_id=c.id and status='confirmed' and not is_demo and scheduled_at between now() and now()+interval '48 hours') then 6 else 24 end) where id=c.id;
 return jsonb_build_object('status',p_status,'candidates',created);
end $$;
create function public.airdrop_confirm(p_actor uuid,p_binding uuid,p_event uuid,p_confirm boolean) returns integer
language plpgsql set search_path='' as $$
declare e public.airdrop_events; room text; count_notified integer;
begin
 select id into room from public.research_questions where rank=public.research_rank(p_actor) and category='General';
 perform public.member_room_guard(p_actor,p_binding,room);
 if not exists(select 1 from public.member_roles where member_id=p_actor and role='steward') then raise exception 'research: steward required'; end if;
 select * into e from public.airdrop_events where id=p_event for update;
 if e.id is null or e.status<>'awaiting_confirmation' or e.is_demo is distinct from coalesce((select is_demo from public.research_profiles where member_id=p_actor),false) then raise exception 'research: event unavailable'; end if;
 update public.airdrop_events set status=case when p_confirm then 'confirmed' else 'dismissed' end,confirmed_by=p_actor,confirmed_at=now() where id=e.id;
 if not p_confirm then return 0; end if;
 insert into public.airdrop_notifications(member_id,follow_id,event_id)
 select distinct on (f.member_id) f.member_id,f.id,e.id from public.launch_follows f
 join public.findings a on a.id=f.finding_id join public.airdrop_guides g on g.version_id=a.current_version
 left join public.airdrop_alert_preferences p on p.follow_id=f.id
 where g.details->>'official'=e.source_url and not coalesce(p.paused,false)
  and e.kind=any(coalesce(p.types,array['announcement','eligibility','claim_open','deadline','requirements']))
  and f.removed_at is null and f.done_at is null and public.research_can_view_v2(f.member_id,a.id)
  and public.research_compatible(f.member_id,a.author_id)
  and e.is_demo=coalesce((select is_demo from public.research_profiles where member_id=f.member_id),false)
 order by f.member_id,f.created_at on conflict do nothing;
 get diagnostics count_notified=row_count;
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_actor,'airdrop.event_confirmed',e.id,jsonb_build_object('notified',count_notified));
 return count_notified;
end $$;
create function public.airdrop_notification_action(p_member uuid,p_binding uuid,p_id uuid,p_action text) returns boolean
language plpgsql set search_path='' as $$
declare n public.airdrop_notifications; f public.launch_follows;
begin
 select * into n from public.airdrop_notifications where id=p_id and member_id=p_member for update;
 select * into f from public.launch_follows where id=n.follow_id and member_id=p_member and removed_at is null;
 if f.finding_id is null or p_action not in ('acknowledge','done') then raise exception 'research: notification unavailable'; end if;
 perform public.launch_follow_mutate(p_member,p_binding,'alpha',f.finding_id,'follow');
 update public.airdrop_notifications set status=case when p_action='done' then 'done' else 'acknowledged' end,
 acknowledged_at=coalesce(acknowledged_at,now()),done_at=case when p_action='done' then now() else done_at end where id=n.id;
 return true;
end $$;
alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_pre_campaign;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.alpha_snapshot_pre_campaign(p_member,p_binding,p_room);
 return s||jsonb_build_object(
 'airdropFollowing',coalesce((select jsonb_agg(jsonb_build_object('followId',f.id,'campaign',c.id,'name',c.name,'url',c.url,'status',case when coalesce(p.paused,false) then 'paused' else c.last_status end,'lastSuccessAt',c.last_success_at,'nextDue',c.next_due,'types',coalesce(p.types,array['announcement','eligibility','claim_open','deadline','requirements']),'paused',coalesce(p.paused,false)))
 from public.launch_follows f join public.findings a on a.id=f.finding_id join public.airdrop_guides g on g.version_id=a.current_version
 join public.airdrop_campaigns c on c.url=g.details->>'official' left join public.airdrop_alert_preferences p on p.follow_id=f.id
 where f.member_id=p_member and f.removed_at is null and exists(select 1 from jsonb_array_elements(s->'findings') v where v->>'id'=a.id::text)),'[]'),
 'airdropNotifications',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object('event',to_jsonb(e)) order by n.created_at desc)
 from public.airdrop_notifications n join public.airdrop_events e on e.id=n.event_id join public.launch_follows f on f.id=n.follow_id
 where n.member_id=p_member and f.removed_at is null and exists(select 1 from jsonb_array_elements(s->'findings') v where v->>'id'=f.finding_id::text)),'[]'),
 'airdropQueue',case when exists(select 1 from public.member_roles where member_id=p_member and role='steward') then coalesce((select jsonb_agg(to_jsonb(e)) from public.airdrop_events e where e.status='awaiting_confirmation' and e.is_demo=coalesce((select is_demo from public.research_profiles where member_id=p_member),false)),'[]') else '[]'::jsonb end);
end $$;
do $$ declare t text; begin
 foreach t in array array['airdrop_campaigns','airdrop_monitor_runs','airdrop_events','airdrop_alert_preferences','airdrop_notifications'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update on public.%I to service_role',t);
 end loop;
end $$;
create trigger immutable_record before update or delete on public.airdrop_monitor_runs for each row execute function public.reject_audit_changes();
revoke all on function public.airdrop_preferences(uuid,uuid,uuid,text[],boolean),public.airdrop_ingest(text,text,jsonb,text,timestamptz,jsonb),public.airdrop_confirm(uuid,uuid,uuid,boolean),public.airdrop_notification_action(uuid,uuid,uuid,text),public.alpha_snapshot(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.airdrop_preferences(uuid,uuid,uuid,text[],boolean),public.airdrop_ingest(text,text,jsonb,text,timestamptz,jsonb),public.airdrop_confirm(uuid,uuid,uuid,boolean),public.airdrop_notification_action(uuid,uuid,uuid,text),public.alpha_snapshot(uuid,uuid,text) to service_role;
commit;
