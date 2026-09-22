begin;

create type public.member_role as enum ('reviewer', 'steward', 'issuer');
create type public.operation_status as enum ('created', 'signed', 'broadcast', 'confirmed', 'reverted');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  email text not null unique check (email = lower(trim(email)) and position('@' in email) > 1),
  created_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references public.members(id) on delete restrict,
  last_otp_at timestamptz,
  otp_requests integer not null default 0 check (otp_requests >= 0),
  check (expires_at > created_at),
  check ((redeemed_at is null) = (redeemed_by is null))
);
create index invitations_email_idx on public.invitations(email);

create table public.member_roles (
  member_id uuid not null references public.members(id) on delete restrict,
  role public.member_role not null,
  granted_by uuid references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (member_id, role)
);

create table public.wallet_challenges (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  address text not null check (address ~ '^0x[0-9a-f]{40}$'),
  nonce text not null unique check (length(nonce) >= 16),
  domain text not null,
  uri text not null,
  chain_id integer not null default 46630 check (chain_id = 46630),
  message text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  unique (id, member_id, address, chain_id),
  check (expires_at > created_at)
);
create index wallet_challenges_member_idx on public.wallet_challenges(member_id);

create table public.wallet_bindings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  address text not null check (address ~ '^0x[0-9a-f]{40}$'),
  chain_id integer not null default 46630 check (chain_id = 46630),
  challenge_id uuid not null unique,
  verified_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (id, member_id),
  foreign key (challenge_id, member_id, address, chain_id)
    references public.wallet_challenges(id, member_id, address, chain_id) on delete restrict
);
create unique index wallet_bindings_current_member on public.wallet_bindings(member_id) where revoked_at is null;
create unique index wallet_bindings_current_address on public.wallet_bindings(chain_id, address) where revoked_at is null;

-- EVM uint256 values are decimal text so PostgREST/JavaScript cannot round them.
create domain public.uint256_decimal as text
  check (value ~ '^(0|[1-9][0-9]{0,77})$'
    and value::numeric <= 115792089237316195423570985008687907853269984665640564039457584007913129639935);

create table public.chain_operations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  wallet_binding_id uuid not null,
  chain_id integer not null default 46630 check (chain_id = 46630),
  contract_address text not null check (contract_address ~ '^0x[0-9a-f]{40}$'),
  recipient_address text not null check (recipient_address ~ '^0x[0-9a-f]{40}$'),
  issuance_key text not null unique check (issuance_key ~ '^0x[0-9a-f]{64}$'),
  status public.operation_status not null default 'created',
  issuer_address text check (issuer_address ~ '^0x[0-9a-f]{40}$'),
  nonce bigint check (nonce >= 0 and nonce <= 9007199254740991),
  signed_transaction text check (signed_transaction ~ '^0x[0-9a-f]+$'),
  transaction_hash text unique check (transaction_hash ~ '^0x[0-9a-f]{64}$'),
  token_id public.uint256_decimal,
  receipt_block public.uint256_decimal,
  receipt_block_hash text check (receipt_block_hash ~ '^0x[0-9a-f]{64}$'),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (wallet_binding_id, member_id) references public.wallet_bindings(id, member_id) on delete restrict,
  unique (chain_id, contract_address, member_id),
  unique (chain_id, issuer_address, nonce),
  check ((nonce is null) = (issuer_address is null)),
  check ((signed_transaction is null) = (transaction_hash is null)),
  check (status = 'created' or (signed_transaction is not null and nonce is not null)),
  check (status not in ('confirmed', 'reverted') or (receipt_block is not null and receipt_block_hash is not null)),
  check (status <> 'confirmed' or token_id is not null),
  check (status <> 'reverted' or token_id is null)
);
create index chain_operations_reconciliation_idx on public.chain_operations(status, updated_at);

create table public.issuer_nonces (
  chain_id integer not null check (chain_id = 46630),
  issuer_address text not null check (issuer_address ~ '^0x[0-9a-f]{40}$'),
  next_nonce bigint not null check (next_nonce >= 0 and next_nonce <= 9007199254740991),
  updated_at timestamptz not null default now(),
  primary key (chain_id, issuer_address)
);

create table public.membership_bindings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  wallet_binding_id uuid not null,
  chain_id integer not null default 46630 check (chain_id = 46630),
  contract_address text not null check (contract_address ~ '^0x[0-9a-f]{40}$'),
  token_id public.uint256_decimal not null,
  ownership_epoch public.uint256_decimal not null,
  verified_block public.uint256_decimal not null,
  verified_block_hash text not null check (verified_block_hash ~ '^0x[0-9a-f]{64}$'),
  mint_operation_id uuid references public.chain_operations(id) on delete restrict,
  bound_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (wallet_binding_id, member_id) references public.wallet_bindings(id, member_id) on delete restrict,
  unique (id, member_id, chain_id, contract_address, token_id, ownership_epoch)
);
create unique index membership_bindings_current_member on public.membership_bindings(member_id) where revoked_at is null;
create unique index membership_bindings_current_token on public.membership_bindings(chain_id, contract_address, token_id) where revoked_at is null;

create table public.promotion_decisions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  membership_binding_id uuid not null,
  chain_id integer not null check (chain_id = 46630),
  contract_address text not null,
  token_id public.uint256_decimal not null,
  ownership_epoch public.uint256_decimal not null,
  tier text not null default 'Silver' check (tier = 'Silver'),
  approved_by uuid not null references public.members(id) on delete restrict,
  rationale text not null check (length(trim(rationale)) > 0),
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) > 0),
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (approved_by <> member_id),
  foreign key (membership_binding_id, member_id, chain_id, contract_address, token_id, ownership_epoch)
    references public.membership_bindings(id, member_id, chain_id, contract_address, token_id, ownership_epoch) on delete restrict
);
create unique index promotion_decisions_current on public.promotion_decisions(member_id, chain_id, contract_address, token_id, ownership_epoch) where revoked_at is null;

create function public.require_promotion_steward() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.member_roles where member_id = new.approved_by and role = 'steward') then
    raise exception 'Promotion requires a steward';
  end if;
  return new;
end;
$$;
create trigger promotion_requires_steward before insert or update of approved_by on public.promotion_decisions
  for each row execute function public.require_promotion_steward();

create function public.require_confirmed_mint() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.mint_operation_id is not null and not exists (
    select 1 from public.chain_operations
    where id = new.mint_operation_id and status = 'confirmed' and member_id = new.member_id
      and token_id = new.token_id and chain_id = new.chain_id and contract_address = new.contract_address
  ) then
    raise exception 'Membership binding requires the matching confirmed mint';
  end if;
  return new;
end;
$$;
create trigger membership_requires_confirmed_mint before insert or update on public.membership_bindings
  for each row execute function public.require_confirmed_mint();

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_member_id uuid references public.members(id) on delete restrict,
  event_type text not null,
  subject_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_events_actor_idx on public.audit_events(actor_member_id, created_at);

create function public.reject_audit_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Audit events are append-only';
end;
$$;
create trigger audit_events_append_only before update or delete on public.audit_events
  for each row execute function public.reject_audit_changes();

-- A Supabase project may grant public-schema access by default. Remove both
-- existing grants and defaults for objects created by subsequent migrations.
revoke create on schema public from public, anon, authenticated;
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges revoke execute on functions from public, anon, authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['members', 'invitations', 'member_roles', 'wallet_challenges', 'wallet_bindings', 'chain_operations', 'issuer_nonces', 'membership_bindings', 'promotion_decisions', 'audit_events'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end;
$$;

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
revoke update, delete, truncate on public.audit_events from service_role;

commit;
