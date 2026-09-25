-- Keep QA authority separate from genuine member work; labels cannot be self-edited.
alter table public.research_profiles add column is_demo boolean not null default false;

create or replace function public.research_can_view(p_member uuid, p_finding uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists(select 1 from public.findings f
    join public.finding_versions v on v.id=f.current_version
    join public.research_profiles author on author.member_id=f.author_id
    where f.id=p_finding and (f.visibility='members' or f.author_id=p_member or
      exists(select 1 from public.research_reviewer_scopes s
        join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
        join public.research_profiles reviewer on reviewer.member_id=s.member_id
        where s.member_id=p_member and s.specialty=v.specialty and reviewer.is_demo=author.is_demo)))
$$;

create or replace function public.research_assign(p_version uuid, p_kind text default 'initial') returns void
language plpgsql set search_path = '' as $$
begin
  insert into public.review_assignments(version_id,reviewer_id,scope,kind)
  select v.id,s.member_id,s.scope,p_kind from public.finding_versions v
  join public.findings f on f.id=v.finding_id
  join public.research_profiles author on author.member_id=f.author_id
  join public.research_reviewer_scopes s on s.specialty=v.specialty and s.member_id<>f.author_id
  join public.research_profiles reviewer on reviewer.member_id=s.member_id and reviewer.is_demo=author.is_demo
  join public.member_roles r on r.member_id=s.member_id and r.role='reviewer'
  where v.id=p_version and not exists(select 1 from public.review_assignments a where a.version_id=v.id and a.completed_at is null)
    and (p_kind<>'dispute' or (not exists(select 1 from public.review_decisions d where d.version_id=v.id and d.reviewer_id=s.member_id)
      and not exists(select 1 from public.finding_disputes d where d.version_id=v.id and d.member_id=s.member_id)))
  order by s.member_id limit 1;
end
$$;

create function public.research_review_boundary() returns trigger
language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.finding_versions v join public.findings f on f.id=v.finding_id
    join public.research_profiles author on author.member_id=f.author_id
    join public.research_profiles reviewer on reviewer.member_id=new.reviewer_id
    where v.id=new.version_id and author.is_demo=reviewer.is_demo and f.author_id<>new.reviewer_id)
    then raise exception 'research: independent reviewer in the same demo/real boundary required'; end if;
  return new;
end
$$;
create trigger review_boundary before insert or update on public.review_assignments for each row execute function public.research_review_boundary();
create trigger review_boundary before insert on public.review_decisions for each row execute function public.research_review_boundary();
revoke all on function public.research_review_boundary() from public,anon,authenticated;
grant execute on function public.research_review_boundary() to service_role;
