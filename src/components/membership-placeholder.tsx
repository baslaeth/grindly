import { MembershipRequired, Screen } from "@/components/screen";
import { requireActiveMembership } from "@/server/membership/access";
import { getEnvironment } from "@/server/environment";
import { ServiceError } from "@/server/errors";

export async function MembershipPlaceholder({ title }: { title: string }) {
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
    <Screen title={title}>
      {unavailable ? (
        <p className="notice" role="alert">
          Ownership check unavailable. Please reload to retry.
        </p>
      ) : active ? (
        <section className="empty-state" aria-label="Unavailable">
          <h2>Not available yet</h2>
        </section>
      ) : (
        <MembershipRequired />
      )}
    </Screen>
  );
}
