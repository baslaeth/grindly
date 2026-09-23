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
  if protected_count <> 10 then
    raise exception 'Expected 10 forced-RLS tables, found %', protected_count;
  end if;
  foreach browser_role in array array['anon', 'authenticated'] loop
    if has_schema_privilege(browser_role, 'public', 'CREATE') then
      raise exception 'Browser role can create public objects';
    end if;
    foreach table_name in array array['members', 'invitations', 'member_roles',
      'wallet_challenges', 'wallet_bindings', 'chain_operations', 'issuer_nonces',
      'membership_bindings', 'promotion_decisions', 'audit_events'] loop
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
      or has_function_privilege(browser_role, 'public.reserve_invitation_otp(text,text,integer,integer)', 'EXECUTE') then
      raise exception 'Browser role can execute invitation RPCs';
    end if;
  end loop;
end;
$$;
select 'PASS: 10 forced-RLS tables; both browser roles denied table access and invitation RPCs' as verification;
rollback;
