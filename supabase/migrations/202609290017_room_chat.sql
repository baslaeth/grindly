begin;
alter table public.discussion_messages add column sequence bigint generated always as identity;
create unique index discussion_sequence on public.discussion_messages(sequence);
create index discussion_room_sequence on public.discussion_messages(question_id,sequence desc);

create table public.chat_revisions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.discussion_messages(id),
  author_id uuid not null references public.members(id),
  body text not null check(length(body)<=2000),
  attachments jsonb not null default '[]' check(jsonb_typeof(attachments)='array' and jsonb_array_length(attachments)<=4),
  deleted boolean not null default false,
  created_at timestamptz not null default clock_timestamp(),
  sequence bigint generated always as identity
);
create index chat_revision_latest on public.chat_revisions(message_id,sequence desc);
create table public.chat_requests (
  member_id uuid not null references public.members(id),
  request_id uuid not null,
  payload jsonb not null,
  result jsonb not null,
  primary key(member_id,request_id)
);
create table public.chat_media (
  id uuid primary key,
  member_id uuid not null references public.members(id),
  room_id text not null references public.research_questions(id),
  message_id uuid references public.discussion_messages(id),
  content_type text not null check(content_type in ('image/png','image/jpeg','image/webp','image/gif')),
  content_base64 text not null check(length(content_base64) between 1 and 2796204),
  byte_size integer not null check(byte_size between 1 and 2097152),
  created_at timestamptz not null default now()
);
create table public.chat_reactions (
  message_id uuid not null references public.discussion_messages(id),
  member_id uuid not null references public.members(id),
  emoji text not null check(emoji in ('like','thanks','insight','question')),
  created_at timestamptz not null default now(),
  primary key(message_id,member_id,emoji)
);
create table public.chat_reads (
  member_id uuid not null references public.members(id),
  room_id text not null references public.research_questions(id),
  last_sequence bigint not null default 0 check(last_sequence>=0),
  primary key(member_id,room_id)
);

create function public.chat_capture_original() returns trigger
language plpgsql set search_path='' as $$
begin
  insert into public.chat_revisions(message_id,author_id,body) values(new.id,new.author_id,new.body);
  return new;
end $$;
insert into public.chat_revisions(message_id,author_id,body,created_at)
select id,author_id,body,created_at from public.discussion_messages order by created_at,id;
create trigger chat_capture_original after insert on public.discussion_messages
for each row execute function public.chat_capture_original();

alter table public.finding_versions add column source_revision uuid references public.chat_revisions(id);
-- Existing versions refer to the immutable original; new versions capture the
-- current source while holding the same message lock as edits/deletes.
-- Existing finding rows are append-only, so do not rewrite their history.
create function public.chat_capture_source() returns trigger
language plpgsql set search_path='' as $$
declare r public.chat_revisions;
begin
  if new.source_message is not null then
    perform pg_advisory_xact_lock(hashtextextended('message:'||new.source_message::text,0));
    select * into r from public.chat_revisions where message_id=new.source_message order by sequence desc limit 1;
    if r.deleted then raise exception 'research: source message was deleted'; end if;
    new.source_revision:=r.id;
  end if;
  return new;
end $$;
create trigger chat_capture_source before insert on public.finding_versions
for each row execute function public.chat_capture_source();

create function public.chat_upload(p_member uuid,p_binding uuid,p_room text,p_id uuid,p_type text,p_content text,p_size integer) returns jsonb
language plpgsql set search_path='' as $$
declare existing public.chat_media;
begin
  perform public.member_room_guard(p_member,p_binding,p_room);
  perform pg_advisory_xact_lock(hashtextextended('chat:'||p_member::text,0));
  select * into existing from public.chat_media where id=p_id;
  if found then
    if existing.member_id<>p_member or existing.room_id<>p_room or existing.content_base64<>p_content then
      raise exception 'research: upload identifier conflict'; end if;
    return jsonb_build_object('id',existing.id);
  end if;
  if (select count(*) from public.chat_media where member_id=p_member and created_at>now()-interval '1 minute')>=12
    or (select coalesce(sum(byte_size),0) from public.chat_media where member_id=p_member and created_at>now()-interval '1 day')+p_size>52428800
    then raise exception 'research: upload limit reached; try later'; end if;
  insert into public.chat_media(id,member_id,room_id,content_type,content_base64,byte_size)
    values(p_id,p_member,p_room,p_type,p_content,p_size);
  return jsonb_build_object('id',p_id);
end $$;

create function public.chat_mutate(p_member uuid,p_binding uuid,p_room text,p_request uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare existing public.chat_requests; m public.discussion_messages; r public.chat_revisions;
  mid uuid; rid uuid; payload jsonb; result jsonb; attachments jsonb; profile public.research_profiles;
begin
  perform public.member_room_guard(p_member,p_binding,p_room);
  perform pg_advisory_xact_lock(hashtextextended('chat:'||p_member::text,0));
  payload:=jsonb_build_object('room',p_room,'action',p_action,'data',p_data);
  select * into existing from public.chat_requests where member_id=p_member and request_id=p_request;
  if found then
    if existing.payload<>payload then raise exception 'research: request identifier conflict'; end if;
    return existing.result;
  end if;
  select * into profile from public.research_profiles where member_id=p_member;
  if not found then raise exception 'research: set your name and specialty first'; end if;
  if p_action='send' then
    if (select count(*) from public.discussion_messages where author_id=p_member and created_at>now()-interval '1 minute')>=30 then
      raise exception 'research: message limit reached; try later'; end if;
    if p_data->>'reply' is not null then
      select * into m from public.discussion_messages where id=(p_data->>'reply')::uuid and question_id=p_room;
      if not found or not public.research_compatible(p_member,m.author_id) then raise exception 'research: reply unavailable'; end if;
    end if;
    attachments:=coalesce(p_data->'attachments','[]');
    if jsonb_typeof(attachments)<>'array' or jsonb_array_length(attachments)>4 then raise exception 'research: invalid attachments'; end if;
    if length(btrim(coalesce(p_data->>'body','')))=0 and jsonb_array_length(attachments)=0 then raise exception 'research: message is empty'; end if;
    if exists(select 1 from jsonb_array_elements_text(attachments) x where not exists(
      select 1 from public.chat_media a where a.id=x::uuid and a.member_id=p_member and a.room_id=p_room and a.message_id is null))
      or (select count(distinct x) from jsonb_array_elements_text(attachments) x)<>jsonb_array_length(attachments)
      then raise exception 'research: attachment unavailable'; end if;
    insert into public.discussion_messages(question_id,author_id,specialty,body,sources,reply_to)
      values(p_room,p_member,profile.specialty,coalesce(nullif(btrim(p_data->>'body'),''),'[Attachment]'),'[]',(p_data->>'reply')::uuid) returning id into mid;
    insert into public.chat_revisions(message_id,author_id,body,attachments)
      values(mid,p_member,coalesce(p_data->>'body',''),attachments) returning id into rid;
    update public.chat_media set message_id=mid where id in(select x::uuid from jsonb_array_elements_text(attachments) x);
  elsif p_action in ('edit','delete','react') then
    perform pg_advisory_xact_lock(hashtextextended('message:'||(p_data->>'message'),0));
    select * into m from public.discussion_messages where id=(p_data->>'message')::uuid and question_id=p_room;
    if not found or not public.research_compatible(p_member,m.author_id) then raise exception 'research: message unavailable'; end if;
    select * into r from public.chat_revisions where message_id=m.id order by sequence desc limit 1;
    if r.deleted then raise exception 'research: message deleted'; end if;
    mid:=m.id;
    if p_action='react' then
      if (p_data->>'active')::boolean then
        insert into public.chat_reactions(message_id,member_id,emoji) values(mid,p_member,p_data->>'emoji') on conflict do nothing;
      else delete from public.chat_reactions where message_id=mid and member_id=p_member and emoji=p_data->>'emoji'; end if;
    else
      if m.author_id<>p_member then raise exception 'research: author required'; end if;
      if r.id<>(p_data->>'revision')::uuid or p_data->>'revision' is null then raise exception 'research: message changed; reload'; end if;
      if p_action='edit' and length(btrim(coalesce(p_data->>'body','')))=0 and jsonb_array_length(r.attachments)=0 then raise exception 'research: message is empty'; end if;
      insert into public.chat_revisions(message_id,author_id,body,attachments,deleted)
        values(mid,p_member,case when p_action='delete' then '' else p_data->>'body' end,
          case when p_action='delete' then '[]'::jsonb else r.attachments end,p_action='delete') returning id into rid;
      insert into public.audit_events(actor_member_id,event_type,subject_id,details)
        values(p_member,'chat.'||p_action,mid,jsonb_build_object('revision',rid));
    end if;
  elsif p_action='read' then
    select * into m from public.discussion_messages where sequence=(p_data->>'sequence')::bigint and question_id=p_room;
    if not found or not public.research_compatible(p_member,m.author_id) then raise exception 'research: message unavailable'; end if;
    insert into public.chat_reads(member_id,room_id,last_sequence) values(p_member,p_room,m.sequence)
      on conflict(member_id,room_id) do update set last_sequence=greatest(public.chat_reads.last_sequence,excluded.last_sequence);
  else raise exception 'research: unknown chat action'; end if;
  result:=jsonb_build_object('id',mid,'revision',rid,'saved',true);
  insert into public.chat_requests values(p_member,p_request,payload,result);
  return result;
end $$;

create function public.chat_snapshot(p_member uuid,p_binding uuid,p_room text,p_before bigint default null,p_after bigint default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare result jsonb;
begin
  perform public.member_room_guard(p_member,p_binding,p_room);
  with selected as (
    select m.* from public.discussion_messages m where question_id=p_room and public.research_compatible(p_member,author_id)
      and (p_before is null or m.sequence<p_before) and (p_after is null or m.sequence>=p_after)
    order by sequence desc limit case when p_after is null then 40 else 500 end
  ), messages as (
    select m.*,r.id revision,r.body current_body,r.attachments,r.deleted,r.created_at revised_at
      from selected m join lateral(select * from public.chat_revisions r where r.message_id=m.id order by sequence desc limit 1) r on true
  )
  select jsonb_build_object('messages',coalesce((select jsonb_agg(jsonb_build_object(
    'id',m.id,'sequence',m.sequence,'author',m.author_id,'name',coalesce(p.display_name,'Member'),'specialty',m.specialty,
    'body',case when m.deleted then '' else m.current_body end,'revision',m.revision,'deleted',m.deleted,
    'edited',m.current_body<>m.body and not m.deleted,'createdAt',m.created_at,'reply',case when exists(select 1 from public.discussion_messages parent
      where parent.id=m.reply_to and public.research_compatible(p_member,parent.author_id)) then m.reply_to else null end,
    'isDemo',coalesce(p.is_demo,false),'sources',case when m.deleted then '[]'::jsonb else m.sources end,
    'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'type',a.content_type)) from public.chat_media a
      where not m.deleted and a.message_id=m.id and m.attachments ? a.id::text),'[]'),
    'reactions',coalesce((select jsonb_agg(jsonb_build_object('emoji',g.emoji,'count',g.n,'mine',g.mine)) from (
      select emoji,count(*) n,bool_or(member_id=p_member) mine from public.chat_reactions cr
      where cr.message_id=m.id and not m.deleted and public.research_compatible(p_member,member_id) group by emoji) g),'[]')
  ) order by m.sequence) from messages m left join public.research_profiles p on p.member_id=m.author_id),'[]'),
  'hasOlder',exists(select 1 from public.discussion_messages m where m.question_id=p_room
    and public.research_compatible(p_member,m.author_id) and m.sequence<(select min(sequence) from selected)),
  'readSequence',coalesce((select last_sequence from public.chat_reads where member_id=p_member and room_id=p_room),0),
  'unread',coalesce((select jsonb_object_agg(q.id,(select count(*) from public.discussion_messages m
    where m.question_id=q.id and m.author_id<>p_member and public.research_compatible(p_member,m.author_id)
    and m.sequence>coalesce((select last_sequence from public.chat_reads where member_id=p_member and room_id=q.id),0)
    and not (select deleted from public.chat_revisions where message_id=m.id order by sequence desc limit 1)))
    from public.research_questions q where q.rank=public.research_rank(p_member)),'{}')) into result;
  return result;
end $$;

create function public.chat_media_read(p_member uuid,p_binding uuid,p_id uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare a public.chat_media; r public.chat_revisions;
begin
  select * into a from public.chat_media where id=p_id;
  if not found then raise exception 'research: media unavailable'; end if;
  perform public.member_room_guard(p_member,p_binding,a.room_id);
  if not public.research_compatible(p_member,a.member_id) then raise exception 'research: media unavailable'; end if;
  if a.message_id is null then
    if a.member_id<>p_member then raise exception 'research: media unavailable'; end if;
  else
    select * into r from public.chat_revisions where message_id=a.message_id order by sequence desc limit 1;
    if r.deleted or not(r.attachments ? a.id::text) then raise exception 'research: media unavailable'; end if;
  end if;
  return jsonb_build_object('type',a.content_type,'content',a.content_base64);
end $$;

do $$ declare t text; begin
  foreach t in array array['chat_revisions','chat_requests','chat_media','chat_reactions','chat_reads'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert on public.%I to service_role',t);
  end loop;
end $$;
grant update on public.chat_media,public.chat_reads to service_role;
grant delete on public.chat_reactions to service_role;
grant usage,select on sequence public.discussion_messages_sequence_seq,public.chat_revisions_sequence_seq to service_role;
create trigger immutable_record before update or delete on public.chat_revisions for each row execute function public.reject_audit_changes();
create trigger immutable_record before update or delete on public.chat_requests for each row execute function public.reject_audit_changes();
revoke all on function public.chat_capture_original(),public.chat_capture_source(),public.chat_upload(uuid,uuid,text,uuid,text,text,integer),public.chat_mutate(uuid,uuid,text,uuid,text,jsonb),public.chat_snapshot(uuid,uuid,text,bigint,bigint),public.chat_media_read(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.chat_upload(uuid,uuid,text,uuid,text,text,integer),public.chat_mutate(uuid,uuid,text,uuid,text,jsonb),public.chat_snapshot(uuid,uuid,text,bigint,bigint),public.chat_media_read(uuid,uuid,uuid) to service_role;
commit;
