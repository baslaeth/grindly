begin;

create function public.issue_wallet_challenge(
  p_id uuid, p_member_id uuid, p_address text, p_nonce text,
  p_domain text, p_uri text, p_message text, p_created_at timestamptz,
  p_expires_at timestamptz
) returns uuid language plpgsql set search_path = '' as $$
begin
  perform 1 from public.members where id = p_member_id for update;
  if not found then raise exception 'Member unavailable'; end if;
  if (select count(*) from public.wallet_challenges
      where member_id = p_member_id and created_at > clock_timestamp() - interval '1 minute') >= 5 then
    raise exception 'Challenge rate limit';
  end if;
  if p_created_at < clock_timestamp() - interval '30 seconds'
    or p_created_at > clock_timestamp() + interval '30 seconds'
    or p_expires_at > p_created_at + interval '5 minutes' then
    raise exception 'Invalid challenge lifetime';
  end if;
  update public.wallet_challenges set consumed_at = clock_timestamp()
    where member_id = p_member_id and consumed_at is null;
  insert into public.wallet_challenges(id, member_id, address, nonce, domain, uri, message, created_at, expires_at)
    values(p_id, p_member_id, p_address, p_nonce, p_domain, p_uri, p_message, p_created_at, p_expires_at);
  return p_id;
end;
$$;

-- Only the trusted server calls this after cryptographic signature verification.
-- The locks and conditional consumption make concurrent replays atomic.
create function public.bind_verified_wallet(p_member_id uuid, p_challenge_id uuid, p_message text)
returns uuid language plpgsql set search_path = '' as $$
declare challenge public.wallet_challenges; binding public.wallet_bindings; result uuid;
begin
  perform 1 from public.members where id = p_member_id for update;
  select * into challenge from public.wallet_challenges
    where id = p_challenge_id and member_id = p_member_id for update;
  if not found or challenge.consumed_at is not null
    or challenge.expires_at <= clock_timestamp() or challenge.message <> p_message then
    raise exception 'Challenge unavailable';
  end if;
  select * into binding from public.wallet_bindings
    where member_id = p_member_id and revoked_at is null;
  if found and binding.address <> challenge.address then
    raise exception 'Wallet already bound';
  end if;
  update public.wallet_challenges set consumed_at = clock_timestamp() where id = challenge.id;
  if binding.id is not null then
    result := binding.id;
  else
    insert into public.wallet_bindings(member_id, address, challenge_id)
      values(p_member_id, challenge.address, challenge.id) returning id into result;
  end if;
  insert into public.audit_events(actor_member_id, event_type, subject_id)
    values(p_member_id, 'wallet.verified', result);
  return result;
end;
$$;

revoke all on function public.issue_wallet_challenge(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.bind_verified_wallet(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.issue_wallet_challenge(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.bind_verified_wallet(uuid,uuid,text) to service_role;

commit;
