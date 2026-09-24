begin;

create function public.create_mint_operation(p_member uuid, p_contract text, p_key text)
returns uuid language plpgsql set search_path = '' as $$
declare wallet public.wallet_bindings; operation_id uuid;
begin
  perform 1 from public.members where id=p_member for update;
  select id into operation_id from public.chain_operations where member_id=p_member and contract_address=p_contract and chain_id=46630;
  if found then return operation_id; end if;
  select * into wallet from public.wallet_bindings where member_id=p_member and revoked_at is null;
  if not found then raise exception 'Verified wallet required'; end if;
  insert into public.chain_operations(member_id,wallet_binding_id,contract_address,recipient_address,issuance_key)
    values(p_member,wallet.id,p_contract,wallet.address,p_key) returning id into operation_id;
  insert into public.audit_events(actor_member_id,event_type,subject_id) values(p_member,'mint.created',operation_id);
  return operation_id;
end;
$$;

create function public.allocate_mint_nonce(p_operation uuid, p_issuer text, p_pending bigint)
returns bigint language plpgsql set search_path = '' as $$
declare operation public.chain_operations; allocated bigint;
begin
  select * into operation from public.chain_operations where id=p_operation for update;
  if not found then raise exception 'Operation unavailable'; end if;
  if operation.nonce is not null then
    if operation.issuer_address<>p_issuer then raise exception 'Issuer mismatch'; end if;
    return operation.nonce;
  end if;
  if operation.status<>'created' or p_pending<0 then raise exception 'Invalid operation state'; end if;
  insert into public.issuer_nonces(chain_id,issuer_address,next_nonce) values(46630,p_issuer,p_pending) on conflict do nothing;
  select greatest(next_nonce,p_pending) into allocated from public.issuer_nonces where chain_id=46630 and issuer_address=p_issuer for update;
  update public.issuer_nonces set next_nonce=allocated+1,updated_at=clock_timestamp() where chain_id=46630 and issuer_address=p_issuer;
  update public.chain_operations set nonce=allocated,issuer_address=p_issuer,updated_at=clock_timestamp() where id=p_operation;
  return allocated;
end;
$$;

create function public.persist_mint_transaction(p_operation uuid,p_signed text,p_hash text)
returns uuid language plpgsql set search_path = '' as $$
begin
  perform 1 from public.chain_operations where id=p_operation and nonce is not null for update;
  if not found then raise exception 'Nonce required'; end if;
  update public.chain_operations set signed_transaction=p_signed,transaction_hash=p_hash,status='signed',updated_at=clock_timestamp()
    where id=p_operation and status='created' and signed_transaction is null;
  return p_operation;
end;
$$;

create function public.bind_owned_token(p_member uuid,p_contract text,p_token text,p_epoch text,p_block text,p_hash text,p_mint uuid default null)
returns uuid language plpgsql set search_path = '' as $$
declare wallet public.wallet_bindings; binding_id uuid; previous public.membership_bindings;
begin
  -- Serialize token rebinding across members as well as each member's current binding.
  perform pg_advisory_xact_lock(hashtextextended(p_contract || ':' || p_token,0));
  perform 1 from public.members where id=p_member for update;
  select * into wallet from public.wallet_bindings where member_id=p_member and revoked_at is null;
  if not found then raise exception 'Verified wallet required'; end if;
  select * into previous from public.membership_bindings where contract_address=p_contract and token_id=p_token and revoked_at is null for update;
  if found then
    if previous.ownership_epoch::numeric>p_epoch::numeric or previous.verified_block::numeric>p_block::numeric then raise exception 'Stale ownership observation'; end if;
    if previous.member_id<>p_member and previous.ownership_epoch=p_epoch then raise exception 'Conflicting ownership observation'; end if;
    if previous.member_id=p_member and previous.ownership_epoch=p_epoch and previous.wallet_binding_id=wallet.id then return previous.id; end if;
  end if;
  update public.membership_bindings set revoked_at=clock_timestamp()
    where revoked_at is null and (member_id=p_member or (contract_address=p_contract and token_id=p_token));
  insert into public.membership_bindings(member_id,wallet_binding_id,contract_address,token_id,ownership_epoch,verified_block,verified_block_hash,mint_operation_id)
    values(p_member,wallet.id,p_contract,p_token,p_epoch,p_block,p_hash,p_mint) returning id into binding_id;
  insert into public.audit_events(actor_member_id,event_type,subject_id) values(p_member,'membership.bound',binding_id);
  return binding_id;
end;
$$;

revoke all on function public.create_mint_operation(uuid,text,text),public.allocate_mint_nonce(uuid,text,bigint),public.persist_mint_transaction(uuid,text,text),public.bind_owned_token(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_mint_operation(uuid,text,text),public.allocate_mint_nonce(uuid,text,bigint),public.persist_mint_transaction(uuid,text,text),public.bind_owned_token(uuid,text,text,text,text,text,uuid) to service_role;
commit;
