-- Run as the project database administrator after applying migrations.
begin;
do $$
declare
  table_name text;
  browser_role text;
  protected_count integer;
begin
  select count(*) into protected_count from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relrowsecurity and c.relforcerowsecurity;
  if protected_count <> 24 then
    raise exception 'Expected 24 forced-RLS tables, found %', protected_count;
  end if;
  foreach browser_role in array array['anon', 'authenticated'] loop
    if has_schema_privilege(browser_role, 'public', 'CREATE') then
      raise exception 'Browser role can create public objects';
    end if;
    foreach table_name in array array['members', 'invitations', 'member_roles',
      'wallet_challenges', 'wallet_bindings', 'chain_operations', 'issuer_nonces',
      'membership_bindings', 'promotion_decisions', 'audit_events',
      'research_questions','research_profiles','research_reviewer_scopes','discussion_messages',
      'findings','finding_versions','review_assignments','review_decisions','research_policy',
      'award_ledger','finding_usefulness','finding_disputes','peer_requests','research_assignment'] loop
      if has_table_privilege(browser_role, 'public.' || table_name,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then
        raise exception 'Browser role % has privileges on %', browser_role, table_name;
      end if;
      execute format('set local role %I', browser_role);
      begin
        execute format('select * from public.%I limit 1', table_name);
        raise exception 'Unexpected browser read access';
      exception when insufficient_privilege then
        null;
      end;
      reset role;
    end loop;
    if has_function_privilege(browser_role, 'public.redeem_invitation(text,uuid)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.reserve_invitation_otp(text,text,integer,integer)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_snapshot(uuid)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_compatible(uuid,uuid)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_use_qualifies(uuid)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_promotion_boundary()', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_assign(uuid,text)', 'EXECUTE')
      or has_function_privilege(browser_role, 'public.research_mutate(uuid,text,jsonb)', 'EXECUTE') then
      raise exception 'Browser role can execute protected invitation/research RPCs';
    end if;
  end loop;
end;
$$;
select 'PASS: 24 forced-RLS tables; both browser roles denied table access and invitation/research RPCs' as verification;
rollback;
