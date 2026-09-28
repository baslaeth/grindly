begin;
create table public.member_activity (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  finding_id uuid not null references public.findings(id),
  kind text not null check(kind in ('evaluation','xp')),
  record_id uuid not null,
  created_at timestamptz not null default now(),
  unique(kind,record_id)
);
create function public.record_member_activity() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_table_name='award_ledger' then
    insert into public.member_activity(member_id,finding_id,kind,record_id)
      values(new.member_id,new.finding_id,'xp',new.id) on conflict do nothing;
  else
    insert into public.member_activity(member_id,finding_id,kind,record_id)
      select f.author_id,f.id,'evaluation',new.id from public.findings f join public.finding_versions v on v.finding_id=f.id
      where v.id=new.version_id on conflict do nothing;
  end if;
  return new;
end $$;
create trigger record_activity after insert on public.review_decisions for each row execute function public.record_member_activity();
create trigger record_activity after insert on public.award_ledger for each row execute function public.record_member_activity();
insert into public.member_activity(member_id,finding_id,kind,record_id,created_at)
select member_id,finding_id,'xp',id,created_at from public.award_ledger;
insert into public.member_activity(member_id,finding_id,kind,record_id,created_at)
select f.author_id,f.id,'evaluation',d.id,d.created_at from public.review_decisions d
join public.finding_versions v on v.id=d.version_id join public.findings f on f.id=v.finding_id;

alter function public.research_snapshot_v3(uuid,uuid,text) rename to research_snapshot_v3_base;
create function public.research_snapshot_v3(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
  s:=public.research_snapshot_v3_base(p_member,p_binding,p_room);
  s:=jsonb_set(s,'{versions}',coalesce((select jsonb_agg(x || jsonb_build_object('source_revision',
    case when x->>'source_message' is null then 'null'::jsonb else x->'source_revision' end))
    from jsonb_array_elements(s->'versions') x),'[]'));
  s:=jsonb_set(s,'{messages}',coalesce((select jsonb_agg(x || jsonb_build_object(
    'body',case when r.deleted then '[Message deleted]' else r.body end,'revision',r.id,'deleted',r.deleted))
    from jsonb_array_elements(s->'messages') x join lateral(select * from public.chat_revisions r
      where r.message_id=(x->>'id')::uuid order by sequence desc limit 1) r on true),'[]'));
  return s || jsonb_build_object(
    'sourceSnapshots',coalesce((select jsonb_agg(jsonb_build_object('version',v.id,'message',m.id,'revision',r.id,
      'author',m.author_id,'body',r.body,'specialty',m.specialty,'room',m.question_id,'createdAt',r.created_at))
      from public.finding_versions v join public.discussion_messages m on m.id=v.source_message
      join lateral(select * from public.chat_revisions r where r.message_id=m.id
        and (v.source_revision is null or r.id=v.source_revision) order by sequence limit 1) r on true
      where exists(select 1 from jsonb_array_elements(s->'versions') x where x->>'id'=v.id::text and x->>'source_message' is not null)),'[]'),
    'activity',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'finding',a.finding_id,'kind',a.kind,'createdAt',a.created_at,
      'xp',w.xp,'decision',d.decision) order by a.created_at desc,a.id)
      from public.member_activity a left join public.award_ledger w on a.kind='xp' and w.id=a.record_id
      left join public.review_decisions d on a.kind='evaluation' and d.id=a.record_id
      where a.member_id=p_member and exists(select 1 from jsonb_array_elements(s->'findings') f where f->>'id'=a.finding_id::text)),'[]'));
end $$;

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(btrim(name)) between 3 and 100),
  description text not null check(length(btrim(description)) between 10 and 1000),
  kind text not null check(length(kind) between 2 and 60),
  eligible_ranks jsonb not null check(jsonb_typeof(eligible_ranks)='array' and jsonb_array_length(eligible_ranks)>0
    and eligible_ranks <@ '["Bronze","Silver","Gold","Platinum","Diamond"]'::jsonb),
  requirements text not null default '' check(length(requirements)<=1000),
  approval_required boolean not null default false,
  status text not null default 'draft' check(status in ('draft','open','closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  public_visible boolean not null default false,
  action_type text not null check(action_type in ('details','external','register','interest','claim')),
  protected_url text check(protected_url ~ '^https://[^[:space:]]+$'),
  claim_active boolean not null default false,
  is_demo boolean not null default false,
  updated_by uuid references public.members(id),
  updated_at timestamptz not null default now(),
  check(ends_at is null or starts_at is null or ends_at>starts_at),
  check(not is_demo or (protected_url is null and not claim_active and action_type<>'claim')),
  check(action_type<>'claim' or (claim_active and protected_url is not null)),
  check(action_type<>'external' or protected_url is not null or is_demo)
);
create table public.opportunity_requirements (
  opportunity_id uuid not null references public.opportunities(id),
  member_id uuid not null references public.members(id),
  approved boolean not null,
  reason text not null check(length(btrim(reason)) between 10 and 1000),
  assessed_by uuid not null references public.members(id),
  updated_at timestamptz not null default now(),
  primary key(opportunity_id,member_id)
);
create table public.opportunity_registrations (
  opportunity_id uuid not null references public.opportunities(id),
  member_id uuid not null references public.members(id),
  status text not null check(status in ('registered','interested')),
  created_at timestamptz not null default now(),
  primary key(opportunity_id,member_id)
);
insert into public.opportunities(name,description,kind,eligible_ranks,status,public_visible,action_type,is_demo)
values('Sample: specialist roundtable','Fictional opportunity for testing interest. No partner, event reservation or allocation exists.','Community',
  '["Bronze","Silver"]','open',true,'interest',true),
  ('Sample: Silver research preview','Fictional preview for testing exact eligibility. No live campaign or external application.','Research',
  '["Silver"]','open',true,'register',true),
  ('Sample: public briefing','A fictional public card showing details only. No registration or monetary value.','Briefing',
  '["Bronze","Silver","Gold","Platinum","Diamond"]','open',true,'details',true);

create function public.opportunity_list(p_sample boolean default false) returns jsonb
language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'kind',kind,
    'ranks',eligible_ranks,'requirements',requirements,'approvalRequired',approval_required,'status',status,
    'startsAt',starts_at,'endsAt',ends_at,'action',action_type,'isDemo',is_demo) order by updated_at desc,id),'[]')
    from public.opportunities where public_visible and status<>'draft' and is_demo=p_sample
$$;
create function public.opportunity_action(p_member uuid,p_binding uuid,p_id uuid,p_action text) returns jsonb
language plpgsql set search_path='' as $$
declare o public.opportunities; rank_name text; registration text; reason text;
begin
  rank_name:=public.research_rank(p_member);
  perform public.member_room_guard(p_member,p_binding,(select id from public.research_questions where rank=rank_name and category='General'));
  select * into o from public.opportunities where id=p_id and public_visible and status<>'draft' for share;
  if not found then raise exception 'research: opportunity unavailable'; end if;
  if o.is_demo<>coalesce((select is_demo from public.research_profiles where member_id=p_member),false) then
    reason:='This opportunity belongs to a separate sample experience';
  elsif not(o.eligible_ranks ? rank_name) then reason:='Eligible ranks: '||(select string_agg(x,', ') from jsonb_array_elements_text(o.eligible_ranks) x);
  elsif o.status<>'open' or o.starts_at>now() or o.ends_at<=now() then reason:='Participation is not open';
  elsif o.approval_required and not exists(select 1 from public.opportunity_requirements where opportunity_id=o.id and member_id=p_member and approved) then
    reason:='Additional requirements need operator verification';
  end if;
  select status into registration from public.opportunity_registrations where opportunity_id=o.id and member_id=p_member;
  if p_action='state' then return jsonb_build_object('eligible',reason is null,'reason',reason,'registration',registration); end if;
  if reason is not null then raise exception 'research: participation requirements not met'; end if;
  if p_action='participate' and o.action_type in ('register','interest') then
    insert into public.opportunity_registrations values(o.id,p_member,case when o.action_type='register' then 'registered' else 'interested' end,now())
      on conflict do nothing;
    select status into registration from public.opportunity_registrations where opportunity_id=o.id and member_id=p_member;
    return jsonb_build_object('registration',registration,'isDemo',o.is_demo);
  elsif p_action='participate' and o.action_type in ('external','claim') and not o.is_demo then
    if o.action_type='claim' and not o.claim_active then raise exception 'research: claim not active'; end if;
    return jsonb_build_object('url',o.protected_url);
  elsif p_action='participate' and o.is_demo and o.action_type='external' then
    return jsonb_build_object('message','Sample only: no official campaign exists.');
  end if;
  raise exception 'research: action unavailable';
end $$;

create function public.opportunity_manage(p_member uuid,p_binding uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare o public.opportunities; is_demo_member boolean; item uuid;
begin
  perform public.member_room_guard(p_member,p_binding,(select id from public.research_questions where rank=public.research_rank(p_member) and category='General'));
  if not exists(select 1 from public.member_roles where member_id=p_member and role='steward') then raise exception 'research: operator required'; end if;
  is_demo_member:=coalesce((select is_demo from public.research_profiles where member_id=p_member),false);
  if p_action='list' then
    return coalesce((select jsonb_agg(to_jsonb(x)) from public.opportunities x where x.is_demo=is_demo_member),'[]');
  end if;
  if p_data->>'id' is not null then
    select * into o from public.opportunities where id=(p_data->>'id')::uuid for update;
    if not found or o.is_demo<>is_demo_member then raise exception 'research: opportunity unavailable'; end if;
  end if;
  if p_action='requirement' then
    if o.id is null or not public.research_compatible(p_member,(p_data->>'member')::uuid) or (p_data->>'member')::uuid=p_member then
      raise exception 'research: independent compatible operator required'; end if;
    insert into public.opportunity_requirements(opportunity_id,member_id,approved,reason,assessed_by)
      values(o.id,(p_data->>'member')::uuid,(p_data->>'approved')::boolean,p_data->>'reason',p_member)
      on conflict(opportunity_id,member_id) do update set approved=excluded.approved,reason=excluded.reason,assessed_by=p_member,updated_at=now();
    item:=o.id;
  elsif p_action='save' then
    -- Claim actions cannot be activated from this editor. A real campaign needs
    -- separate owner approval and verified claim implementation first.
    if p_data->>'action'='claim' then raise exception 'research: claims are not active'; end if;
    item:=coalesce(o.id,gen_random_uuid());
    insert into public.opportunities(id,name,description,kind,eligible_ranks,requirements,approval_required,status,starts_at,ends_at,
      public_visible,action_type,protected_url,is_demo,updated_by)
    values(item,p_data->>'name',p_data->>'description',p_data->>'kind',p_data->'ranks',p_data->>'requirements',
      (p_data->>'approvalRequired')::boolean,p_data->>'status',(p_data->>'startsAt')::timestamptz,(p_data->>'endsAt')::timestamptz,
      (p_data->>'publicVisible')::boolean,p_data->>'action',nullif(p_data->>'url',''),is_demo_member,p_member)
    on conflict(id) do update set name=excluded.name,description=excluded.description,kind=excluded.kind,
      eligible_ranks=excluded.eligible_ranks,requirements=excluded.requirements,approval_required=excluded.approval_required,
      status=excluded.status,starts_at=excluded.starts_at,ends_at=excluded.ends_at,public_visible=excluded.public_visible,
      action_type=excluded.action_type,protected_url=excluded.protected_url,updated_by=p_member,updated_at=now();
  else raise exception 'research: unknown management action'; end if;
  insert into public.audit_events(actor_member_id,event_type,subject_id) values(p_member,'opportunity.'||p_action,item);
  return jsonb_build_object('id',item,'saved',true);
end $$;

do $$ declare t text; begin
  foreach t in array array['member_activity','opportunities','opportunity_requirements','opportunity_registrations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert on public.%I to service_role',t);
  end loop;
end $$;
grant update on public.opportunities,public.opportunity_requirements to service_role;
create trigger immutable_record before update or delete on public.member_activity for each row execute function public.reject_audit_changes();
revoke all on function public.research_snapshot_v3(uuid,uuid,text),public.record_member_activity(),public.opportunity_list(boolean),public.opportunity_action(uuid,uuid,uuid,text),public.opportunity_manage(uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.research_snapshot_v3(uuid,uuid,text),public.opportunity_list(boolean),public.opportunity_action(uuid,uuid,uuid,text),public.opportunity_manage(uuid,uuid,text,jsonb) to service_role;
commit;
