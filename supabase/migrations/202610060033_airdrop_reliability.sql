begin;
-- Preserve completed analyses; fresh explicit runs append rather than overwrite.
drop index public.alpha_one_complete_review;
do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.alpha_begin_review(uuid,uuid,uuid)'::regprocedure);
 if position('status in (''running'',''complete'')' in definition)=0 then raise exception 'Unexpected review definition'; end if;
 definition:=replace(definition,'status in (''running'',''complete'')','status=''running''');
 definition:=replace(definition,'interval ''2 minutes''','interval ''10 minutes''');
 execute definition;
 definition:=pg_get_functiondef('public.airdrop_ingest(text,text,jsonb,text,timestamptz,jsonb)'::regprocedure);
 if position('c.url,p_source_date,p_source_date,' in definition)=0 then raise exception 'Unexpected ingest definition'; end if;
 -- Publication metadata is not an established announcement timestamp.
 execute replace(definition,'c.url,p_source_date,p_source_date,','c.url,p_source_date,null,');
end $$;

create function public.airdrop_alert_time_guard() returns trigger language plpgsql set search_path='' as $$
declare e public.airdrop_events;
begin
 select * into e from public.airdrop_events where id=new.event_id;
 if not e.is_demo and e.kind in ('claim_open','deadline') and
   (coalesce(e.observed_available_at,e.scheduled_at,e.announced_at) is null or
    coalesce(e.observed_available_at,e.scheduled_at,e.announced_at)<now()-interval '1 day') then
   return null;
 end if;
 return new;
end $$;
create trigger airdrop_alert_time_guard before insert on public.airdrop_notifications
 for each row execute function public.airdrop_alert_time_guard();

-- A reminder derives from an operator-confirmed saved deadline, not a page change.
-- Retain its parent event ID in the fingerprint; no event passage is invented.
create function public.airdrop_due_reminders() returns integer language plpgsql set search_path='' as $$
declare e public.airdrop_events; reminder uuid; n integer; total integer:=0;
begin
 for e in select * from public.airdrop_events a where kind='deadline' and status='confirmed'
   and scheduled_at between now() and now()+interval '24 hours' and fingerprint not like 'reminder:%'
   and not exists(select 1 from public.airdrop_events later where later.campaign_id=a.campaign_id
     and later.kind='deadline' and later.status='confirmed' and later.is_demo=a.is_demo
     and later.fingerprint not like 'reminder:%' and later.detected_at>a.detected_at)
 loop
  insert into public.airdrop_events(campaign_id,fingerprint,kind,passage,source_url,source_date,
    announced_at,scheduled_at,observed_available_at,status,required_action,is_demo,confirmed_by,confirmed_at)
  values(e.campaign_id,'reminder:'||e.id::text,'deadline',e.passage,e.source_url,e.source_date,
    e.announced_at,e.scheduled_at,null,'confirmed','Deadline approaching. '||left(e.required_action,470),e.is_demo,e.confirmed_by,e.confirmed_at)
  on conflict do nothing returning id into reminder;
  if reminder is null then select id into reminder from public.airdrop_events where campaign_id=e.campaign_id and fingerprint='reminder:'||e.id::text and is_demo=e.is_demo; end if;
  insert into public.airdrop_notifications(member_id,follow_id,event_id)
  select distinct on(f.member_id) f.member_id,f.id,reminder from public.launch_follows f
   join public.findings a on a.id=f.finding_id join public.airdrop_guides g on g.version_id=a.current_version
   left join public.airdrop_alert_preferences p on p.follow_id=f.id
   left join public.launch_watch_preferences w on w.member_id=f.member_id
   where g.details->>'official'=e.source_url and not coalesce(p.paused,false) and coalesce(w.reminders,true)
    and 'deadline'=any(coalesce(p.types,array['announcement','eligibility','claim_open','deadline','requirements']))
    and f.removed_at is null and f.done_at is null and public.research_can_view_v2(f.member_id,a.id)
    and public.research_compatible(f.member_id,a.author_id)
    and e.is_demo=coalesce((select is_demo from public.research_profiles where member_id=f.member_id),false)
   order by f.member_id,f.created_at on conflict do nothing;
  get diagnostics n=row_count; total:=total+n;
 end loop;
 return total;
end $$;
revoke all on function public.airdrop_alert_time_guard(),public.airdrop_due_reminders() from public,anon,authenticated;
grant execute on function public.airdrop_due_reminders() to service_role;
commit;
