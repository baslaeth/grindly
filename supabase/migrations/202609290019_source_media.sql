begin;
-- A submitted source is immutable, including attachments, but never public.
alter function public.research_snapshot_v3(uuid,uuid,text) rename to research_snapshot_v3_text;
create function public.research_snapshot_v3(p_member uuid,p_binding uuid,p_room text default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
  s:=public.research_snapshot_v3_text(p_member,p_binding,p_room);
  return jsonb_set(s,'{sourceSnapshots}',coalesce((select jsonb_agg(x || jsonb_build_object('attachments',
    coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'type',a.content_type))
      from public.chat_revisions r join public.chat_media a on a.message_id=r.message_id and r.attachments ? a.id::text
      where r.id=(x->>'revision')::uuid),'[]')))
    from jsonb_array_elements(s->'sourceSnapshots') x),'[]'));
end $$;
create function public.chat_source_media_read(p_member uuid,p_binding uuid,p_id uuid,p_version uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare a public.chat_media; v public.finding_versions; f public.findings; r public.chat_revisions;
begin
  select * into v from public.finding_versions where id=p_version;
  select * into f from public.findings where id=v.finding_id;
  select * into a from public.chat_media where id=p_id and message_id=v.source_message;
  if a.id is null or not public.research_can_view_v2(p_member,f.id)
    or not public.research_compatible(p_member,f.author_id) or not public.research_compatible(p_member,a.member_id)
    then raise exception 'research: media unavailable'; end if;
  perform public.member_room_guard(p_member,p_binding,a.room_id);
  select * into r from public.chat_revisions where message_id=v.source_message
    and (v.source_revision is null or id=v.source_revision) order by sequence limit 1;
  if r.id is null or r.deleted or not(r.attachments ? a.id::text) then raise exception 'research: media unavailable'; end if;
  return jsonb_build_object('type',a.content_type,'content',a.content_base64);
end $$;
revoke all on function public.research_snapshot_v3(uuid,uuid,text),public.chat_source_media_read(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.research_snapshot_v3(uuid,uuid,text),public.chat_source_media_read(uuid,uuid,uuid,uuid) to service_role;
commit;
