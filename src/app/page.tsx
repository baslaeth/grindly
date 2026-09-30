import Link from "next/link";
import { Screen } from "@/components/screen";
import { OpportunityCard } from "@/components/opportunity-card";
import { OpportunityManager } from "@/components/opportunity-manager";
import { MemberActivity } from "@/components/member-activity";
import { publicOpportunities } from "@/server/opportunities";
import { readResearch } from "@/server/research/service";
import { getCurrentMember } from "@/server/auth/session";
import { getEnvironment } from "@/server/environment";
import { createDataClient } from "@/server/supabase";
import { reportFailure } from "@/server/diagnostics";
import { participationReason, type Opportunity } from "@/opportunities/model";
import type { ResearchData } from "@/research/model";
export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sample?: string }>;
}) {
  const sample = (await searchParams).sample === "1";
  let cards: Opportunity[] = [];
  let data: ResearchData | undefined;
  let signedIn = false;
  let unavailable = false;
  const registrations = new Map<string, string>();
  const approvals = new Set<string>();
  try {
    cards = await publicOpportunities(sample);
  } catch (e) {
    reportFailure("home.cards", e);
    unavailable = true;
  }
  if (getEnvironment().GRINDLY_STAGE !== "foundation")
    try {
      signedIn = !!(await getCurrentMember());
      if (signedIn) {
        data = await readResearch();
        const db = createDataClient();
        const entries = await db
          .from("opportunity_registrations")
          .select("opportunity_id,status")
          .eq("member_id", data.memberId);
        const requirements = await db
          .from("opportunity_requirements")
          .select("opportunity_id,verified_requirements")
          .eq("member_id", data.memberId)
          .eq("approved", true);
        if (entries.error || requirements.error)
          throw new Error("Opportunity state unavailable");
        for (const e of entries.data ?? [])
          registrations.set(e.opportunity_id, e.status);
        for (const r of requirements.data ?? [])
          if (
            cards.find((c) => c.id === r.opportunity_id)?.requirements ===
            r.verified_requirements
          )
            approvals.add(r.opportunity_id);
      }
    } catch (e) {
      reportFailure("home.membership", e);
    }
  const demo = !!data?.profiles.find((p) => p.member_id === data?.memberId)
    ?.is_demo;
  return (
    <Screen title="Home">
      <section className="home-intro">
        <h2>
          Contribute where you have an edge.
          <br />
          Get help where you don&apos;t.
        </h2>
        <div className="form-actions">
          <Link className="button" href={data ? "/workbench" : "/join"}>
            {data ? "Enter Hub" : signedIn ? "Verify membership" : "Sign in"}
          </Link>
          <Link className="inline-link" href={sample ? "/" : "/?sample=1"}>
            {sample ? "Back to Home" : "Explore sample opportunities"}
          </Link>
        </div>
      </section>
      {sample && (
        <p className="notice">
          Separate sample experience. All cards here are fictional. No real
          partnership, application, payment or claim.
        </p>
      )}
      <section className="section">
        <h2>Grind Intelligence</h2>
        <p>
          Explore your alpha&apos;s checked sources, missing information, earlier
          work and later outcomes. Source checks are not proof that a claim is
          correct.
        </p>
        <Link className="inline-link" href="/intelligence">
          Explore Grind Intelligence
        </Link>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2>{sample ? "Sample opportunities" : "Opportunities"}</h2>
        </div>
        <p className="muted">
          Opportunities arranged by Grindly have their own participation
          requirements. Members receive opportunities, not an obligation to
          perform business tasks.
        </p>
        {unavailable ? (
          <p role="status">
            Opportunities are temporarily unavailable. Please retry.
          </p>
        ) : !cards.length ? (
          <p>No public opportunities have been published yet.</p>
        ) : (
          <div className="opportunity-grid">
            {cards.map((card) => (
              <OpportunityCard
                key={card.id}
                card={card}
                signedIn={signedIn}
                registration={registrations.get(card.id)}
                locked={participationReason(
                  card,
                  data?.token.tier ?? null,
                  demo,
                  approvals.has(card.id),
                )}
              />
            ))}
          </div>
        )}
      </section>
      {data && <MemberActivity data={data} limit={5} />}
      {data?.roles.includes("steward") && <OpportunityManager />}
    </Screen>
  );
}
