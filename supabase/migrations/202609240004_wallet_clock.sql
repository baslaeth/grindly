begin;

-- Issuance, signature verification, and atomic consumption use one clock authority.
create function public.wallet_proof_clock() returns timestamptz
language sql volatile set search_path = '' as $$
  select clock_timestamp();
$$;
revoke all on function public.wallet_proof_clock() from public, anon, authenticated;
grant execute on function public.wallet_proof_clock() to service_role;

commit;
