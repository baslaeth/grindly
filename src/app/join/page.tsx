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
import { CoreLoop } from "@/components/core-loop";
import { ArrowDown, ArrowRight } from "lucide-react";

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
      <section
        className="join-intro"
        aria-label="Specialist exchange introduction"
      >
        <p className="eyebrow">An edge of your own. Expertise beyond it.</p>
        <h2>
          Contribute where you have an edge. Get help where you don&apos;t.
        </h2>
        <p>
          Crypto research is too broad to do well alone. Bring the work you know
          best; connect it with specialists who see what you do not. Together,
          turn scattered sources into reviewed evidence.
        </p>
        <div className="form-actions">
          <a className="button" href="#invitation">
            {member ? "Continue your membership" : "Join with invitation"}
            <ArrowRight size={16} />
          </a>
          <a className="inline-link" href="#public-example">
            See a specialist exchange <ArrowDown size={16} />
          </a>
        </div>
      </section>
      <section className="section access-section" id="invitation">
        <div className="access-context">
          <p className="eyebrow">Your way into the exchange</p>
          <h2>Membership opens the door. Your work builds the history.</h2>
          <p>
            Verify your email and wallet, then mint or bind a testnet membership
            NFT. Membership provides access and displays current progression; it
            does not purchase expertise or review authority.
          </p>
          <ol className="entry-steps">
            <li>Invitation and email</li>
            <li>Wallet ownership</li>
            <li>Membership access</li>
          </ol>
        </div>
        <div className="auth-tool">
          <h2>Invitation access</h2>
          {member ? (
            <div className="account-state">
              <p className="email-target">{member.email}</p>
              <p className="notice">
                Email verified. Wallet verification and active NFT membership
                are required for research access.
              </p>
              <SignOutButton />
            </div>
          ) : (
            <JoinForm available={available} pendingEmail={intent?.email} />
          )}
        </div>
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
      <CoreLoop />
      <section
        className="section sample"
        id="public-example"
        aria-label="Public sample"
      >
        <span className="sample-label">Public example, illustrative only</span>
        <p className="example-question">
          A shared question: what would make a testnet research task worth
          attempting?
        </p>
        <IllustrativeScenario />
      </section>
    </Screen>
  );
}
