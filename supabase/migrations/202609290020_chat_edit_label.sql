begin;
-- Attachment-only initial sends have a legacy placeholder body, not an edit.
alter function public.chat_snapshot(uuid,uuid,text,bigint,bigint) rename to chat_snapshot_base;
create function public.chat_snapshot(p_member uuid,p_binding uuid,p_room text,p_before bigint default null,p_after bigint default null) returns jsonb
language plpgsql stable set search_path='' as $$
declare s jsonb;
begin
  s:=public.chat_snapshot_base(p_member,p_binding,p_room,p_before,p_after);
  return jsonb_set(s,'{messages}',coalesce((select jsonb_agg(x || jsonb_build_object('edited',
    not (x->>'deleted')::boolean and exists(select 1 from public.audit_events a
      where a.subject_id=(x->>'id')::uuid and a.event_type='chat.edit')))
    from jsonb_array_elements(s->'messages') x),'[]'));
end $$;
revoke all on function public.chat_snapshot(uuid,uuid,text,bigint,bigint) from public,anon,authenticated;
grant execute on function public.chat_snapshot(uuid,uuid,text,bigint,bigint) to service_role;
commit;
