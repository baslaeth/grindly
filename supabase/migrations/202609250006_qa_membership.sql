begin;

alter table public.chain_operations add column binding_completed_at timestamptz;
-- Legacy completed mint bindings must never be replayed by reconciliation.
update public.chain_operations o set binding_completed_at=b.bound_at
from public.membership_bindings b where b.mint_operation_id=o.id;

create or replace function public.bind_owned_token(p_member uuid,p_contract text,p_token text,p_epoch text,p_block text,p_hash text,p_mint uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare wallet public.wallet_bindings; binding_id uuid; previous public.membership_bindings; operation public.chain_operations;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_contract || ':' || p_token,0));
  perform 1 from public.members where id=p_member for update;
  select * into wallet from public.wallet_bindings where member_id=p_member and revoked_at is null;
  if not found then raise exception 'Verified wallet required'; end if;

  if p_mint is not null then
    select * into operation from public.chain_operations where id=p_mint for update;
    if not found or operation.status<>'confirmed' or operation.member_id<>p_member
      or operation.contract_address<>p_contract or operation.token_id<>p_token
      or operation.chain_id<>46630 then raise exception 'Membership binding requires the matching confirmed mint'; end if;
    if operation.binding_completed_at is not null then return null; end if;
    -- A recovery is an initial bind, never an instruction to replace subsequent
    -- explicit binding history (including history whose active row was revoked).
    if exists(select 1 from public.membership_bindings where member_id=p_member
      or (contract_address=p_contract and token_id=p_token)) then
      update public.chain_operations set binding_completed_at=clock_timestamp() where id=p_mint;
      return null;
    end if;
  end if;

  -- History is the high-water mark even when no active binding remains.
  if exists(select 1 from public.membership_bindings
    where contract_address=p_contract and token_id=p_token
      and (ownership_epoch::numeric>p_epoch::numeric or verified_block::numeric>p_block::numeric)) then
    raise exception 'Stale ownership observation';
  end if;
  if exists(select 1 from public.membership_bindings
    where contract_address=p_contract and token_id=p_token
      and ownership_epoch=p_epoch and member_id<>p_member) then
    raise exception 'Conflicting ownership observation';
  end if;
  if exists(select 1 from public.membership_bindings where member_id=p_member
    and (verified_block::numeric>p_block::numeric or
      (verified_block::numeric=p_block::numeric and (contract_address<>p_contract or token_id<>p_token)))) then
    raise exception 'Stale member observation';
  end if;
  select * into previous from public.membership_bindings
    where contract_address=p_contract and token_id=p_token and revoked_at is null for update;
  if found and previous.member_id=p_member and previous.ownership_epoch=p_epoch and previous.wallet_binding_id=wallet.id then
    update public.membership_bindings set verified_block=p_block,verified_block_hash=p_hash where id=previous.id;
    return previous.id;
  end if;
  update public.membership_bindings set revoked_at=clock_timestamp()
    where revoked_at is null and (member_id=p_member or (contract_address=p_contract and token_id=p_token));
  insert into public.membership_bindings(member_id,wallet_binding_id,contract_address,token_id,ownership_epoch,verified_block,verified_block_hash,mint_operation_id)
    values(p_member,wallet.id,p_contract,p_token,p_epoch,p_block,p_hash,p_mint) returning id into binding_id;
  if p_mint is not null then
    update public.chain_operations set binding_completed_at=clock_timestamp() where id=p_mint;
  end if;
  insert into public.audit_events(actor_member_id,event_type,subject_id) values(p_member,'membership.bound',binding_id);
  return binding_id;
end;
$$;
revoke all on function public.bind_owned_token(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.bind_owned_token(uuid,text,text,text,text,text,uuid) to service_role;
commit;
