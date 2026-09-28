-- Additive rank model. Legacy research RPCs remain for the undeployed UI's
-- predecessor; the new app uses only the binding-checked v2 entry points.
begin;

alter table public.research_questions add column rank text not null default 'Bronze' check(rank in ('Bronze','Silver'));
alter table public.research_questions add column category text not null default 'General';
create unique index research_room_rank_category on public.research_questions(rank,category);
insert into public.research_questions(id,title,purpose,gaps,rank,category)
select lower(r.rank)||'-'||c.slug,
  case when c.slug='general' then 'Which evidence should we investigate together?'
    else 'What should '||c.label||' investigate together?' end,
  'Share a specific question, primary sources and limitations. Connect complementary work without implying investment advice or guaranteed rewards.',
  '{"operations":"What practical requirements remain unclear?","project":"Which claims need primary sources?","risk":"What limitations or risks need checking?"}'::jsonb,
  r.rank,c.label
from (values('Bronze'),('Silver')) r(rank)
cross join (values('general','General'),('whitelist-hunters','Whitelist Hunters'),
  ('airdrop-hunters','Airdrop Hunters'),('presale-hunters','Presale Hunters'),('degens','Degens'),
  ('traders','Traders'),('project-analysts','Project Analysts'),
  ('seed-and-early-stage-investors','Seed and Early Stage Investors'),
  ('nft-specialists','NFT Specialists'),('meta-catchers','Meta Catchers')) c(slug,label)
where not(r.rank='Bronze' and c.slug='general');
alter table public.research_profiles add column bio text not null default '' check(length(bio)<=300);
alter table public.research_profiles add column interest text not null default 'Project Analysts'
  check(interest in ('Whitelist Hunters','Airdrop Hunters','Presale Hunters','Degens','Traders','Project Analysts','Seed and Early Stage Investors','NFT Specialists','Meta Catchers'));

-- Tier is a durable fact about this NFT, not a claim about its current owner.
-- No demotion or automatic promotion rule is introduced. Historical revoked
-- decisions are not resurrected. New decisions keep their original attribution.
create table public.nft_tier_events (
  id uuid primary key default gen_random_uuid(),
  chain_id integer not null check(chain_id=46630),
  contract_address text not null check(contract_address ~ '^0x[0-9a-f]{40}$'),
  token_id public.uint256_decimal not null,
  tier text not null check(tier='Silver'),
  promotion_id uuid not null unique references public.promotion_decisions(id),
  recorded_at timestamptz not null default now(),
  unique(chain_id,contract_address,token_id)
);
insert into public.nft_tier_events(chain_id,contract_address,token_id,tier,promotion_id,recorded_at)
select distinct on(d.chain_id,d.contract_address,d.token_id)
  d.chain_id,d.contract_address,d.token_id,d.tier,d.id,d.approved_at
from public.promotion_decisions d
join public.member_roles r on r.member_id=d.approved_by and r.role='steward'
where d.revoked_at is null
  and coalesce((select is_demo from public.research_profiles where member_id=d.member_id),false)
    =coalesce((select is_demo from public.research_profiles where member_id=d.approved_by),false)
order by d.chain_id,d.contract_address,d.token_id,d.approved_at,d.id;

create function public.nft_record_tier() returns trigger
language plpgsql set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('rank:'||new.contract_address||':'||new.token_id,0));
  if new.revoked_at is null then
    insert into public.nft_tier_events(chain_id,contract_address,token_id,tier,promotion_id,recorded_at)
    values(new.chain_id,new.contract_address,new.token_id,new.tier,new.id,new.approved_at)
    on conflict(chain_id,contract_address,token_id) do nothing;
  end if;
  return new;
end $$;
create trigger nft_record_tier after insert on public.promotion_decisions
for each row execute function public.nft_record_tier();

create function public.nft_tier(p_contract text,p_token text) returns text
language sql stable set search_path='' as $$
  select coalesce((select tier from public.nft_tier_events where chain_id=46630
    and contract_address=p_contract and token_id=p_token),'Bronze')
$$;

create table public.nft_acquisition_events (
  id uuid primary key default gen_random_uuid(),
  binding_id uuid not null unique references public.membership_bindings(id),
  kind text not null check(kind in ('newly_issued','purchased','unknown')),
  evidence text,
  recorded_at timestamptz not null default now(),
  check(kind<>'purchased' or length(btrim(coalesce(evidence,'')))>10)
);
create function public.nft_record_acquisition() returns trigger
language plpgsql set search_path='' as $$
begin
  insert into public.nft_acquisition_events(binding_id,kind,recorded_at)
  values(new.id,case when new.ownership_epoch='1' and exists(select 1 from public.chain_operations o
    where o.chain_id=new.chain_id and o.contract_address=new.contract_address and o.token_id=new.token_id
      and o.member_id=new.member_id and o.status='confirmed') then 'newly_issued' else 'unknown' end,new.bound_at);
  return new;
end $$;
create trigger nft_record_acquisition after insert on public.membership_bindings
for each row execute function public.nft_record_acquisition();
insert into public.nft_acquisition_events(binding_id,kind,recorded_at)
select b.id,case when b.ownership_epoch='1' and exists(select 1 from public.chain_operations o
  where o.chain_id=b.chain_id and o.contract_address=b.contract_address and o.token_id=b.token_id
    and o.member_id=b.member_id and o.status='confirmed') then 'newly_issued' else 'unknown' end,b.bound_at
from public.membership_bindings b;

-- Recorded binding membership is useful for routing and directories only. The
-- Node service MUST verify the acting member's live owner/epoch before each RPC.
create function public.research_rank(p_member uuid) returns text
language sql stable set search_path='' as $$
  select public.nft_tier(b.contract_address,b.token_id) from public.membership_bindings b
  join public.wallet_bindings w on w.id=b.wallet_binding_id and w.member_id=b.member_id and w.revoked_at is null
  where b.member_id=p_member and b.revoked_at is null
$$;
create function public.research_can_view_v2(p_member uuid,p_finding uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.findings f join public.research_questions q on q.id=f.question_id
    where f.id=p_finding and q.rank=public.research_rank(p_member)
      and public.research_can_view(p_member,p_finding))
$$;

-- Fictional display-only data, deliberately not members, wallets or award rows.
create table public.rank_demo_profiles (
  id text primary key,
  name text not null,
  rank text not null check(rank in ('Bronze','Silver')),
  specialty text not null,
  bio text not null,
  personal_xp integer not null check(personal_xp>=0),
  acquisition text not null check(acquisition in ('newly_issued','progressed','purchased','unknown'))
);
insert into public.rank_demo_profiles values
 ('alex','Alex','Bronze','Whitelist Hunters','Checks eligibility against primary terms; asks analysts to check project dependencies.',40,'newly_issued'),
 ('david','David','Bronze','Airdrop Hunters','Builds participation checklists without assuming future rewards.',60,'unknown'),
 ('mina','Mina','Bronze','Presale Hunters','Separates allocation terms from marketing claims.',30,'newly_issued'),
 ('sam','Sam','Silver','Degens','Documents uncertainty and downside before testing a speculative idea.',80,'progressed'),
 ('noor','Noor','Silver','Traders','Checks execution assumptions and the limits of market observations.',95,'purchased'),
 ('iris','Iris','Bronze','Project Analysts','Maps documented dependencies and unanswered protocol questions.',55,'newly_issued'),
 ('eli','Eli','Silver','Seed and Early Stage Investors','Examines early-stage claims, evidence gaps and conflicts.',120,'progressed'),
 ('tess','Tess','Bronze','NFT Specialists','Checks token rights and distinguishes ownership from personal credit.',35,'unknown'),
 ('rae','Rae','Silver','Meta Catchers','Connects emerging narratives to falsifiable research questions.',90,'progressed');
create table public.rank_demo_delegations (
  id text primary key,
  delegate_id text not null references public.rank_demo_profiles(id),
  owner_id text not null references public.rank_demo_profiles(id),
  status text not null check(status in ('current','past')),
  nft_xp integer not null check(nft_xp>=0),
  check(delegate_id<>owner_id)
);
insert into public.rank_demo_delegations values('alex-david','alex','david','current',12),('tess-david','tess','david','past',8);
create table public.rank_demo_messages (
  id text primary key,
  question_id text not null references public.research_questions(id),
  author_id text not null references public.rank_demo_profiles(id),
  body text not null,
  reply_to text references public.rank_demo_messages(id),
  delegation_id text references public.rank_demo_delegations(id),
  sequence integer not null
);
insert into public.rank_demo_messages values
 ('bronze-1','testnet-readiness','david','Before I spend time on an eligibility checklist, which documented requirements are still unclear?',null,null,1),
 ('bronze-2','testnet-readiness','alex','I separated the published requirements from assumptions. Iris, can you check which project dependencies the checklist relies on?','bronze-1','alex-david',2),
 ('bronze-3','testnet-readiness','iris','I can trace those dependencies to primary documentation. Unconfirmed requirements should remain open questions, not accepted evidence.','bronze-2',null,3),
 ('bronze-4','testnet-readiness','david','I will contribute my own limitations section. Alex authored the delegated checklist; that is not my personal research.','bronze-3',null,4),
 ('silver-1','silver-general','rae','An emerging narrative needs a testable question. Which claims would change your assessment?',null,null,1),
 ('silver-2','silver-general','eli','I would separate documented usage from projected demand, and disclose funding conflicts before independent review.','silver-1',null,2),
 ('silver-3','silver-general','noor','I can add execution assumptions. Repeating the same market source must not count as independent confirmation.','silver-2',null,3);

do $$ declare t text; begin
  foreach t in array array['nft_tier_events','nft_acquisition_events','rank_demo_profiles','rank_demo_delegations','rank_demo_messages'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert on public.%I to service_role',t);
    execute format('create trigger immutable_record before update or delete on public.%I for each row execute function public.reject_audit_changes()',t);
  end loop;
end $$;
revoke all on function public.nft_record_tier(),public.nft_record_acquisition(),public.nft_tier(text,text),public.research_rank(uuid),public.research_can_view_v2(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nft_record_tier(),public.nft_record_acquisition(),public.nft_tier(text,text),public.research_rank(uuid),public.research_can_view_v2(uuid,uuid) to service_role;
commit;
