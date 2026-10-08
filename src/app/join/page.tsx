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
import Link from "next/link";
import { demoAccess } from "@/server/membership/research-access";

export const metadata: Metadata = { title: "Login" };
export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const demoMode = (await searchParams).mode === "demo";
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
  let demo: Awaited<ReturnType<typeof demoAccess>> = null;
  try {
    demo = member ? await demoAccess(member.id) : null;
  } catch {
    return (
      <Screen title="Login">
        <p className="notice" role="alert">
          Account access is unavailable. Please retry or contact the person who
          invited you.
        </p>
        <SignOutButton />
      </Screen>
    );
  }
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
    <Screen title="Login">
      <section className="section access-section" id="invitation">
        <div className="access-context">
          <h2>
            {demo || demoMode
              ? "Explore Grindly"
              : member
                ? "Continue to your membership"
                : "Welcome to Grindly"}
          </h2>
          <p>
            {demo || demoMode ? (
              "Use your email and the shared demo code to explore Bronze rooms, submit sample alphas and follow updates. No wallet is needed."
            ) : (
              <>
                Verify your email and wallet, then mint or bind a testnet
                membership NFT. Membership provides access and displays current
                progression; it does not purchase expertise or review authority.
              </>
            )}
          </p>
          {!demo && !demoMode && (
            <ol className="entry-steps">
              <li>Invitation and email</li>
              <li>Wallet ownership</li>
              <li>Membership access</li>
            </ol>
          )}
        </div>
        <div className="auth-tool">
          <h2>{demo || demoMode ? "Try the demo" : "Invitation access"}</h2>
          {member ? (
            <div className="account-state">
              <p className="email-target">{member.email}</p>
              <p className="notice">
                {demo
                  ? "Your demo account is ready."
                  : "Email verified. Wallet verification and active NFT membership are required for research access."}
              </p>
              {demo && (
                <Link className="button" href="/workbench">
                  Open your demo Hub
                </Link>
              )}
              <SignOutButton />
            </div>
          ) : (
            <JoinForm
              available={available}
              pendingEmail={intent?.email}
              initialMode={intent?.demo || demoMode ? "demo" : "join"}
            />
          )}
        </div>
      </section>
      {member && !demo && (
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
      <details
        className="section sample"
        id="public-example"
        aria-label="Public sample"
      >
        <summary>About Grindly and membership</summary>
        <CoreLoop />
        <IllustrativeScenario />
      </details>
    </Screen>
  );
}
