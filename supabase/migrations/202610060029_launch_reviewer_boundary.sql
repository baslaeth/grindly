begin;
-- Older schemas grant scope INSERT but not UPDATE/DELETE to service_role.
-- Keep table privileges unchanged; this existing guarded operation is the boundary.
alter function public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean) security definer;
alter function public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean) set search_path='';
revoke all on function public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.launch_set_reviewer(uuid,uuid,uuid,text,text,boolean) to service_role;
commit;
