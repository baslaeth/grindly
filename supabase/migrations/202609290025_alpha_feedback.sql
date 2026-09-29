begin;
create table public.alpha_feedback (
 id uuid primary key default gen_random_uuid(),version_id uuid not null references public.alpha_versions(version_id),member_id uuid not null references public.members(id),
 request_id uuid not null,kind text not null check(kind in ('correction','challenge','useful')),detail text not null check(length(btrim(detail)) between 10 and 1500),
 source text not null check(source ~ '^https://[^[:space:]]+$'),created_at timestamptz not null default now(),unique(member_id,request_id)
);
alter table public.alpha_feedback enable row level security;
alter table public.alpha_feedback force row level security;
revoke all on public.alpha_feedback from public,anon,authenticated;
grant select,insert on public.alpha_feedback to service_role;
create trigger immutable_record before update or delete on public.alpha_feedback for each row execute function public.reject_audit_changes();
create function public.alpha_add_feedback(p_member uuid,p_binding uuid,p_version uuid,p_request uuid,p_kind text,p_detail text,p_source text) returns uuid
language plpgsql set search_path='' as $$
declare f public.findings; prior public.alpha_feedback; item uuid;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 if f.author_id=p_member then raise exception 'research: feedback must be independent'; end if;
 perform pg_advisory_xact_lock(hashtextextended('alpha-feedback:'||p_member::text,0));
 select * into prior from public.alpha_feedback where member_id=p_member and request_id=p_request;
 if found then
  if prior.version_id<>p_version or prior.kind<>p_kind or prior.detail<>p_detail or prior.source<>p_source then raise exception 'research: request conflict'; end if;
  return prior.id;
 end if;
 insert into public.alpha_feedback(version_id,member_id,request_id,kind,detail,source) values(p_version,p_member,p_request,p_kind,p_detail,p_source) returning id into item;
 return item;
end $$;
alter function public.alpha_snapshot(uuid,uuid,text) rename to alpha_snapshot_base;
create function public.alpha_snapshot(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
 s:=public.alpha_snapshot_base(p_member,p_binding,p_room);
 return s||jsonb_build_object('serverTime',now(),'alphaFeedback',coalesce((select jsonb_agg(to_jsonb(a)-'request_id' order by a.created_at) from public.alpha_feedback a
 where exists(select 1 from jsonb_array_elements(s->'versions') v where v->>'id'=a.version_id::text)),'[]'));
end $$;
create function public.alpha_appeal(p_member uuid,p_binding uuid,p_version uuid,p_reason text) returns uuid
language plpgsql set search_path='' as $$
declare f public.findings; item uuid;
begin
 select * into f from jsonb_populate_record(null::public.findings,public.alpha_version_guard(p_member,p_binding,p_version));
 select * into f from public.findings where id=f.id for update;
 if f.current_version<>p_version or f.status not in ('accepted','needs_correction','rejected') or length(btrim(p_reason))<10 then raise exception 'research: decided current version required'; end if;
 insert into public.finding_disputes(version_id,member_id,reason) values(p_version,p_member,p_reason) returning id into item;
 update public.review_assignments set completed_at=now() where version_id=p_version and completed_at is null;
 update public.findings set status='disputed' where id=f.id;
 perform public.research_assign_v2(p_version,'dispute');
 insert into public.audit_events(actor_member_id,event_type,subject_id,details) values(p_member,'alpha.appealed',item,'{}');
 return item;
end $$;
revoke all on function public.alpha_add_feedback(uuid,uuid,uuid,uuid,text,text,text),public.alpha_snapshot(uuid,uuid,text),public.alpha_appeal(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.alpha_add_feedback(uuid,uuid,uuid,uuid,text,text,text),public.alpha_snapshot(uuid,uuid,text),public.alpha_appeal(uuid,uuid,uuid,text) to service_role;
commit;
