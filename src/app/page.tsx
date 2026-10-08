import Link from "next/link";
import { HomeActions, HomeEcosystem } from "@/components/home-ecosystem";
import { Screen } from "@/components/screen";
import { OpportunityCard } from "@/components/opportunity-card";
import { OpportunityManager } from "@/components/opportunity-manager";
import { MemberActivity } from "@/components/member-activity";
import { AlphaSummary } from "@/components/alpha-summary";
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
    <Screen title="Home" hideHeading>
      <section className="home-intro" aria-label="About Grindly">
        <h1>Grindly</h1>
        <p>
          A gamified community for crypto specialists. Share useful research,
          help each other and build reputation through reviewed contributions.
        </p>
        <HomeActions member={!!data} signedIn={signedIn} />
      </section>
      {data ? (
        <details className="home-explainer">
          <summary>Membership and the Grindly journey</summary>
          <HomeEcosystem rooms={data.rooms} rank={data.token.tier} />
        </details>
      ) : (
        <HomeEcosystem />
      )}
      {data && (
        <section className="section">
          <div className="section-heading">
            <h2>Recent alphas</h2>
            <Link className="inline-link" href="/workbench">
              Browse rooms
            </Link>
          </div>
          <div className="alpha-feed">
            {data.findings
              .filter((f) => f.visibility === "members")
              .sort((a, b) =>
                (
                  data.versions.find((v) => v.id === b.current_version)
                    ?.submitted_at ?? ""
                ).localeCompare(
                  data.versions.find((v) => v.id === a.current_version)
                    ?.submitted_at ?? "",
                ),
              )
              .slice(0, 4)
              .map((f) => (
                <AlphaSummary
                  key={f.id}
                  data={data}
                  version={f.current_version!}
                  preview
                />
              ))}
          </div>
          {!data.findings.some((f) => f.visibility === "members") && (
            <p className="empty-state">
              No shared alphas yet. Explore a room or contribute your first
              finding.
            </p>
          )}
        </section>
      )}
      {sample && (
        <p className="notice">
          Separate sample experience. Fictional cards, with no real partnership,
          application, payment or claim.
        </p>
      )}
      <section className="section">
        <div className="section-heading">
          <h2>{sample ? "Sample opportunities" : "Opportunities"}</h2>
        </div>
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
                followed={data?.follows?.some(
                  (f) => f.opportunity_id === card.id,
                )}
                participated={
                  data?.follows?.find((f) => f.opportunity_id === card.id)
                    ?.participated
                }
                canFollow={!!data && card.isDemo === demo}
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
      {data && (
        <p>
          <Link className="inline-link" href="/following">
            Following and updates
          </Link>
        </p>
      )}
      {data?.roles.includes("steward") && <OpportunityManager />}
    </Screen>
  );
}
