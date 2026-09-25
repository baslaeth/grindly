-- A superseded/disputed deliverable cannot continue to look currently accepted.
create function public.research_assignment_correction() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.current_version is distinct from old.current_version or new.status in ('disputed','needs_correction') then
    update public.research_assignment set work_status='needs_correction'
      where version_id=old.current_version and work_status in ('accepted','submitted');
  end if;
  return new;
end
$$;
create trigger assignment_correction after update of current_version,status on public.findings
  for each row execute function public.research_assignment_correction();
revoke all on function public.research_assignment_correction() from public,anon,authenticated;
grant execute on function public.research_assignment_correction() to service_role;
