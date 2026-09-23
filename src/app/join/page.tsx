import type { Metadata } from "next";
import { Screen } from "@/components/screen";
import { JoinForm, SignOutButton } from "@/components/join-form";
import { getEnvironment } from "@/server/environment";
import { getCurrentMember } from "@/server/auth/session";
import { readOtpIntent } from "@/server/auth/service";

export const metadata: Metadata = { title: "Join / Membership" };
export const dynamic = "force-dynamic";

export default async function JoinPage() {
  let available = getEnvironment().GRINDLY_STAGE !== "foundation";
  let member: Awaited<ReturnType<typeof getCurrentMember>> = null;
  if (available) {
    try {
      member = await getCurrentMember();
    } catch {
      available = false;
    }
  }
  const intent = await readOtpIntent();
  return (
    <Screen title="Join / Membership">
      <section className="section">
        <h2>Invitation access</h2>
        {member ? (
          <div className="account-state">
            <p className="email-target">{member.email}</p>
            <p className="notice">
              Email verified. Wallet verification and active NFT membership are
              required for research access.
            </p>
            <SignOutButton />
          </div>
        ) : (
          <JoinForm available={available} pendingEmail={intent?.email} />
        )}
      </section>
      <section className="section sample" aria-label="Public sample">
        <div className="sample-heading">
          <h2>Public sample</h2>
          <span className="sample-label">Illustrative only</span>
        </div>
        <p>
          What evidence would support a responsible assessment of a new
          protocol?
        </p>
        <dl className="coverage">
          <div>
            <dt>Protocol research</dt>
            <dd>Architecture, dependencies, and documented assumptions.</dd>
          </div>
          <div>
            <dt>On-chain data / risk</dt>
            <dd>Observed activity, concentration, and evidence limitations.</dd>
          </div>
          <div>
            <dt>Opportunity operations</dt>
            <dd>Eligibility, scope, and practical requirements.</dd>
          </div>
        </dl>
      </section>
    </Screen>
  );
}
