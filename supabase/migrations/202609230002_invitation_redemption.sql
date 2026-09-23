begin;

create function public.reserve_invitation_otp(
  p_token_hash text, p_email text, p_cooldown_seconds integer default 60, p_max_requests integer default 10
) returns boolean language plpgsql set search_path = '' as $$
declare invitation public.invitations;
begin
  if p_cooldown_seconds < 1 or p_cooldown_seconds > 3600 or p_max_requests < 1 or p_max_requests > 100 then
    raise exception 'Invalid OTP limits';
  end if;
  select * into invitation from public.invitations where token_hash = p_token_hash for update;
  if not found or invitation.email <> lower(trim(p_email)) or invitation.expires_at <= now()
    or invitation.revoked_at is not null or invitation.redeemed_at is not null then
    return false;
  end if;
  if invitation.otp_requests >= p_max_requests or invitation.last_otp_at > now() - make_interval(secs => p_cooldown_seconds) then
    return false;
  end if;
  update public.invitations set last_otp_at = now(), otp_requests = otp_requests + 1 where id = invitation.id;
  return true;
end;
$$;

create function public.redeem_invitation(p_token_hash text, p_auth_user_id uuid)
returns uuid language plpgsql set search_path = '' as $$
declare invitation public.invitations; verified_email text; member_id uuid;
begin
  select lower(trim(email)) into verified_email from auth.users
    where id = p_auth_user_id and email_confirmed_at is not null;
  if verified_email is null then raise exception 'Invitation unavailable'; end if;

  select * into invitation from public.invitations where token_hash = p_token_hash for update;
  if not found or invitation.email <> verified_email or invitation.expires_at <= now()
    or invitation.revoked_at is not null or invitation.redeemed_at is not null then
    raise exception 'Invitation unavailable';
  end if;

  insert into public.members(auth_user_id, email) values (p_auth_user_id, verified_email)
    on conflict (auth_user_id) do update set email = excluded.email returning id into member_id;
  update public.invitations set redeemed_at = now(), redeemed_by = member_id where id = invitation.id;
  insert into public.audit_events(actor_member_id, event_type, subject_id)
    values (member_id, 'invitation.redeemed', invitation.id);
  return member_id;
end;
$$;

revoke all on function public.reserve_invitation_otp(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.redeem_invitation(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_invitation_otp(text, text, integer, integer) to service_role;
grant execute on function public.redeem_invitation(text, uuid) to service_role;
grant usage on schema auth to service_role;
grant select(id, email, email_confirmed_at) on auth.users to service_role;

commit;
