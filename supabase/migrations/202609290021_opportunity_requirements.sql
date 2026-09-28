begin;
-- Stated additional requirements must not be bypassed by a rank-only action.
alter table public.opportunities add constraint opportunity_requirements_verified
  check(length(btrim(requirements))=0 or approval_required);
commit;
