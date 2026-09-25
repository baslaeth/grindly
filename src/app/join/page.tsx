import type { Metadata } from "next";
import { Screen } from "@/components/screen";
import { JoinForm, SignOutButton } from "@/components/join-form";
import { getEnvironment } from "@/server/environment";
import { getCurrentMember } from "@/server/auth/session";
import { readOtpIntent } from "@/server/auth/service";
import { createDataClient } from "@/server/supabase";
import { WalletProof } from "@/components/wallet-proof";
import { MembershipActions } from "@/components/membership-actions";
import { IllustrativeScenario } from "@/components/research-views";

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
  let wallet: string | null = null;
  let walletUnavailable = false;
  if (member) {
    const result = await createDataClient()
      .from("wallet_bindings")
      .select("address")
      .eq("member_id", member.id)
      .is("revoked_at", null)
      .maybeSingle();
    walletUnavailable = !!result.error;
    wallet = result.data?.address ?? null;
  }
  return (
    <Screen title="Join / Membership">
      <section className="section sample" aria-label="Public sample">
        <span className="sample-label">Public example, illustrative only</span>
        <h2 className="record-title">
          Contribute where you have an edge. Get help where you don&apos;t.
        </h2>
        <p>
          One research question. Three complementary specialties. Bring
          evidence, have it independently reviewed, and receive attributable
          credit.
        </p>
        <IllustrativeScenario />
      </section>
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
      {member && (
        <section className="section">
          <h2>Wallet ownership</h2>
          {walletUnavailable ? (
            <p className="form-error" role="alert">
              Wallet status unavailable. Please reload.
            </p>
          ) : (
            <WalletProof boundAddress={wallet} />
          )}
        </section>
      )}
      {wallet && getEnvironment().GRINDLY_STAGE === "membership" && (
        <section className="section">
          <h2>Membership NFT</h2>
          <MembershipActions />
        </section>
      )}
    </Screen>
  );
}
