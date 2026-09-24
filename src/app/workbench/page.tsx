import { MembershipRequired, Screen } from "@/components/screen";
import { requireActiveMembership } from "@/server/membership/access";
import { getEnvironment } from "@/server/environment";
import { ServiceError } from "@/server/errors";
export const dynamic = "force-dynamic";
export default async function WorkbenchPage() {
  let active = false;
  let unavailable = false;
  if (getEnvironment().GRINDLY_STAGE === "membership") {
    try {
      await requireActiveMembership();
      active = true;
    } catch (error) {
      unavailable = !(
        error instanceof ServiceError && [401, 403, 404].includes(error.status)
      );
    }
  }
  return (
    <Screen title="Research Workbench">
      {unavailable ? (
        <p className="notice" role="alert">
          Ownership check unavailable. Please reload to retry.
        </p>
      ) : active ? (
        <section className="section">
          <h2>Research</h2>
          <p>No findings yet.</p>
        </section>
      ) : (
        <MembershipRequired />
      )}
    </Screen>
  );
}
