begin;
create function public.airdrop_confirmation_state() returns trigger
language plpgsql set search_path='' as $$
begin
 if not new.is_demo and old.status='awaiting_confirmation' and new.status in ('confirmed','dismissed') then
  update public.airdrop_campaigns c set last_status='active'
  where c.id=new.campaign_id and c.last_status='awaiting_confirmation'
   and not exists(select 1 from public.airdrop_events e where e.campaign_id=c.id and not e.is_demo and e.status='awaiting_confirmation');
 end if;
 return new;
end $$;
create trigger airdrop_confirmation_state after update of status on public.airdrop_events
 for each row execute function public.airdrop_confirmation_state();
revoke all on function public.airdrop_confirmation_state() from public,anon,authenticated;
grant execute on function public.airdrop_confirmation_state() to service_role;
commit;
