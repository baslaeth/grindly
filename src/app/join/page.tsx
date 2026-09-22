import type { Metadata } from "next";
import { Screen } from "@/components/screen";

export const metadata: Metadata = { title: "Join / Membership" };

export default function JoinPage() {
  return <Screen title="Join / Membership">
    <section className="section"><h2>Invitation access</h2><p className="notice" role="status">Invitation sign-in is not available yet.</p></section>
    <section className="section sample" aria-label="Public sample">
      <div className="sample-heading"><h2>Public sample</h2><span className="sample-label">Illustrative only</span></div>
      <p>What evidence would support a responsible assessment of a new protocol?</p>
      <dl className="coverage">
        <div><dt>Protocol research</dt><dd>Architecture, dependencies, and documented assumptions.</dd></div>
        <div><dt>On-chain data / risk</dt><dd>Observed activity, concentration, and evidence limitations.</dd></div>
        <div><dt>Opportunity operations</dt><dd>Eligibility, scope, and practical requirements.</dd></div>
      </dl>
    </section>
  </Screen>;
}
