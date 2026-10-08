begin;

create table public.demo_codes (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check(token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.demo_otp_requests (
  code_id uuid not null references public.demo_codes(id),
  email text not null,
  window_started_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  requests integer not null default 1,
  primary key(code_id,email)
);
create table public.demo_access (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.members(id),
  code_id uuid not null references public.demo_codes(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
do $$ declare t text; begin
  foreach t in array array['demo_codes','demo_otp_requests','demo_access'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
end $$;

create function public.reserve_demo_otp(p_token_hash text,p_email text) returns boolean
language plpgsql set search_path='' as $$
declare c public.demo_codes; r public.demo_otp_requests; address text:=lower(trim(p_email));
begin
  select * into c from public.demo_codes where token_hash=p_token_hash and revoked_at is null for update;
  if not found or length(address)>254 or address not like '%@%' then return false; end if;
  select * into r from public.demo_otp_requests where code_id=c.id and email=address for update;
  if found and (r.last_requested_at>now()-interval '60 seconds'
    or (r.window_started_at>now()-interval '1 hour' and r.requests>=5)) then return false; end if;
  if (select coalesce(sum(requests),0) from public.demo_otp_requests
    where code_id=c.id and window_started_at>now()-interval '1 hour')>=100 then return false; end if;
  insert into public.demo_otp_requests(code_id,email) values(c.id,address)
  on conflict(code_id,email) do update set
    requests=case when demo_otp_requests.window_started_at<=now()-interval '1 hour' then 1 else demo_otp_requests.requests+1 end,
    window_started_at=case when demo_otp_requests.window_started_at<=now()-interval '1 hour' then now() else demo_otp_requests.window_started_at end,
    last_requested_at=now();
  return true;
end $$;

create function public.redeem_demo(p_token_hash text,p_auth_user_id uuid) returns uuid
language plpgsql set search_path='' as $$
declare c public.demo_codes; address text; m uuid; existing boolean;
begin
  select lower(trim(email)) into address from auth.users where id=p_auth_user_id and email_confirmed_at is not null;
  if address is null then raise exception 'Demo unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended('demo:'||p_auth_user_id::text,0));
  select * into c from public.demo_codes where token_hash=p_token_hash and revoked_at is null for share;
  if c.id is null or not exists(select 1 from public.demo_otp_requests where code_id=c.id and email=address
    and last_requested_at>now()-interval '10 minutes') then raise exception 'Demo unavailable'; end if;
  select id into m from public.members where auth_user_id=p_auth_user_id;
  existing:=m is not null;
  if existing then
    if not exists(select 1 from public.demo_access d join public.research_profiles p on p.member_id=d.member_id
      where d.member_id=m and d.revoked_at is null and p.is_demo) then raise exception 'Use returning member sign-in for this account'; end if;
    return m;
  end if;
  insert into public.members(auth_user_id,email) values(p_auth_user_id,address) returning id into m;
  insert into public.research_profiles(member_id,display_name,specialty,is_demo)
    values(m,'Demo member '||left(m::text,8),'operations',true);
  insert into public.demo_access(member_id,code_id) values(m,c.id);
  insert into public.audit_events(actor_member_id,event_type,subject_id) values(m,'demo.joined',c.id);
  return m;
end $$;

create function public.has_demo_access(p_member uuid,p_access uuid default null) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.demo_access d join public.research_profiles p on p.member_id=d.member_id
    where d.member_id=p_member and (p_access is null or d.id=p_access) and d.revoked_at is null and p.is_demo)
$$;

create function public.demo_no_chain() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.demo_access where member_id=new.member_id) then
    raise exception 'Demo accounts do not issue or bind NFTs';
  end if;
  return new;
end $$;
create trigger demo_no_mint before insert on public.chain_operations for each row execute function public.demo_no_chain();
create trigger demo_no_nft_binding before insert on public.membership_bindings for each row execute function public.demo_no_chain();
revoke all on function public.demo_no_chain() from public,anon,authenticated;

create or replace function public.research_rank(p_member uuid) returns text
language sql stable set search_path='' as $$
  select case when public.has_demo_access(p_member) then 'Bronze' else (
    select public.nft_tier(b.contract_address,b.token_id) from public.membership_bindings b
    join public.wallet_bindings w on w.id=b.wallet_binding_id and w.member_id=b.member_id and w.revoked_at is null
    where b.member_id=p_member and b.revoked_at is null) end
$$;

create or replace function public.member_room_guard(p_member uuid,p_binding uuid,p_room text) returns void
language plpgsql stable set search_path='' as $$
begin
  if (not public.has_demo_access(p_member,p_binding) and not exists(
    select 1 from public.membership_bindings b join public.wallet_bindings w
    on w.id=b.wallet_binding_id and w.member_id=b.member_id and w.revoked_at is null
    where b.id=p_binding and b.member_id=p_member and b.revoked_at is null))
    or not exists(select 1 from public.research_questions where id=p_room and rank=public.research_rank(p_member))
  then raise exception 'research: room unavailable'; end if;
end $$;

-- Extend the existing snapshot and mutation gates without copying their large,
-- unchanged payloads. Abort on unexpected definitions rather than skip a gate.
do $$ declare body text; old text; replacement text; begin
  body:=pg_get_functiondef('public.research_snapshot_v2(uuid,uuid,text)'::regprocedure);
  old:='if not exists(select 1 from public.membership_bindings where id=p_binding and member_id=p_member and revoked_at is null) then';
  replacement:='if not public.has_demo_access(p_member,p_binding) and not exists(select 1 from public.membership_bindings where id=p_binding and member_id=p_member and revoked_at is null) then';
  if strpos(body,old)=0 then raise exception 'Unexpected snapshot gate'; end if;
  body:=replace(body,old,replacement);
  old:='  return result;';
  replacement:=$patch$  result:=jsonb_set(result,'{directory}',(result->'directory') || coalesce((
    select jsonb_agg(jsonb_build_object('id',p.member_id,'name',p.display_name,'bio',p.bio,'specialty',p.interest,
      'is_demo',true,'tier','Bronze','token','','contract','','bound_at',d.created_at,
      'personal_xp',(select coalesce(sum(xp),0) from public.award_ledger where member_id=p.member_id),
      'acquisitions','[]'::jsonb,'progression','[]'::jsonb))
    from public.demo_access d join public.research_profiles p on p.member_id=d.member_id
    where d.revoked_at is null and p.is_demo and rank_name='Bronze'
      and not exists(select 1 from public.membership_bindings b where b.member_id=p.member_id and b.revoked_at is null)
  ),'[]'::jsonb));
  return result;$patch$;
  if strpos(body,old)=0 then raise exception 'Unexpected snapshot return'; end if;
  execute replace(body,old,replacement);
  body:=pg_get_functiondef('public.research_mutate_v2(uuid,uuid,text,jsonb)'::regprocedure);
  old:=$patch$  if not found then raise exception 'research: active binding required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('rank:'||active_binding.contract_address||':'||active_binding.token_id,0));$patch$;
  replacement:=$patch$  if not found and not public.has_demo_access(p_member,p_binding) then raise exception 'research: active binding required'; end if;
  if active_binding.id is not null then
    perform pg_advisory_xact_lock(hashtextextended('rank:'||active_binding.contract_address||':'||active_binding.token_id,0));
  end if;
  if public.has_demo_access(p_member,p_binding) and p_action in ('promote','claimAssignment','deliverAssignment') then
    raise exception 'research: unavailable for demo accounts';
  end if;$patch$;
  if strpos(body,old)=0 then raise exception 'Unexpected mutation gate'; end if;
  execute replace(body,old,replacement);
end $$;

revoke all on function public.reserve_demo_otp(text,text),public.redeem_demo(text,uuid),public.has_demo_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_demo_otp(text,text),public.redeem_demo(text,uuid),public.has_demo_access(uuid,uuid) to service_role;
commit;
