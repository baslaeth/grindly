import Link from "next/link";
import {
  ArrowRight,
  FilePlus2,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { ResearchForm, RefreshResearch } from "./research-forms";
import {
  credit,
  evidenceBrief,
  person,
  sources,
  specialtyLabel,
  type ResearchData,
} from "@/research/model";
import { illustration } from "@/research/illustration";

const date = (value: string) =>
  new Date(value).toISOString().replace("T", " ").slice(0, 16) + " UTC";
export function SourceLinks({ value }: { value: unknown }) {
  return (
    <ul className="source-list">
      {sources(value).map((s, i) => (
        <li key={`${s.url}-${i}`}>
          <a href={s.url} target="_blank" rel="noreferrer">
            <ExternalLink size={13} aria-hidden="true" />
            {s.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
function Identity({
  data,
  id,
  specialty,
}: {
  data: ResearchData;
  id: string;
  specialty?: string;
}) {
  const profile = data.profiles.find((p) => p.member_id === id);
  return (
    <div className="byline">
      <strong>{person(data, id)}</strong>
      {profile?.is_demo && (
        <span className="sample-label">Illustrative QA persona</span>
      )}
      <span className={`specialty ${specialty ?? profile?.specialty}`}>
        {specialtyLabel(specialty ?? profile?.specialty ?? "")}
      </span>
      <span className="status-label">
        {data.tiers[id] ?? "Membership not checked"}
      </span>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status-label ${value}`}>
      {(
        {
          pending: "Pending review",
          needs_correction: "Needs correction",
          accepted: "Accepted",
          disputed: "Independent review",
        } as Record<string, string>
      )[value] ?? value}
    </span>
  );
}
export function IllustrativeScenario() {
  return (
    <section className="section" aria-label="Illustrative collaboration">
      <div className="section-heading">
        <h2>How complementary work adds up</h2>
        <span className="sample-label">
          Illustrative scenario: fictional people and outcomes
        </span>
      </div>
      <div className="specialist-grid">
        {illustration.map((p) => (
          <article className="specialist" key={p.name}>
            <h3>{p.name}</h3>
            <span className={`specialty ${p.specialty}`}>
              {specialtyLabel(p.specialty)}
            </span>
            <p>{p.claim}</p>
            <p className="muted">{p.added}</p>
            <p>{p.use}</p>
            <p className="muted">{p.limitation}</p>
            <a
              className="inline-link"
              href={p.source}
              target="_blank"
              rel="noreferrer"
            >
              Reference source
            </a>
          </article>
        ))}
      </div>
      <p className="muted">
        Illustrative brief: combine documented dependencies, observation limits
        and a practical checklist. Alex and Mina share a documentation source,
        not two independent confirmations. These examples earn no real XP and
        show no real membership tiers.
      </p>
    </section>
  );
}
export function Workbench({ data }: { data: ResearchData }) {
  const brief = evidenceBrief(data);
  const profile = data.profiles.find((p) => p.member_id === data.memberId);
  const gaps = data.question.gaps as Record<string, string>;
  return (
    <>
      <section className="section question">
        <div className="section-heading">
          <h2>{data.question.title}</h2>
          <RefreshResearch />
        </div>
        <p>{data.question.purpose}</p>
        <Link href="/findings/new" className="button">
          <FilePlus2 size={16} />
          Contribute evidence
        </Link>
        <dl className="coverage">
          {Object.entries(gaps).map(([key, gap]) => (
            <div key={key}>
              <dt>{specialtyLabel(key)}</dt>
              <dd>{gap}</dd>
              <dd>
                <Status
                  value={
                    brief.open.includes(key)
                      ? "Open question"
                      : brief.accepted
                            .filter((a) => a.version.specialty === key)
                            .every(
                              (a) =>
                                data.profiles.find(
                                  (p) => p.member_id === a.finding.author_id,
                                )?.is_demo,
                            )
                        ? "Illustrative QA coverage only"
                        : "Supported within stated limits"
                  }
                />
              </dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="section">
        <h2>Participants</h2>
        {data.profiles.length ? (
          data.profiles.map((p) => (
            <Identity key={p.member_id} data={data} id={p.member_id} />
          ))
        ) : (
          <p className="muted">No member profiles yet.</p>
        )}
        <details open={!profile}>
          <summary>
            {profile
              ? "Edit your specialist profile"
              : "Set your name and specialty"}
          </summary>
          <ResearchForm kind="profile" data={data} />
        </details>
      </section>
      <section className="section" aria-label="Specialist discussion">
        <div className="section-heading">
          <h2>Specialist discussion</h2>
          <span className="muted">Messages are not reviewed findings</span>
        </div>
        {data.messages.length === 0 && (
          <p>No messages yet. Which gap can you help resolve?</p>
        )}
        {data.messages.map((m) => (
          <article
            className={`message ${m.reply_to ? "reply" : ""}`}
            id={`message-${m.id}`}
            key={m.id}
          >
            <Identity data={data} id={m.author_id} specialty={m.specialty} />
            <time dateTime={m.created_at}>{date(m.created_at)}</time>
            {m.reply_to && (
              <a className="inline-link" href={`#message-${m.reply_to}`}>
                Reply to{" "}
                {person(
                  data,
                  data.messages.find((p) => p.id === m.reply_to)?.author_id ??
                    "",
                )}
              </a>
            )}
            <p className="preserve-lines">{m.body}</p>
            <SourceLinks value={m.sources} />
            <div className="form-actions">
              <Link
                className="inline-link"
                href={`/findings/new?message=${m.id}`}
              >
                <FilePlus2 size={15} />
                Develop a finding
              </Link>
              <details>
                <summary>
                  <MessageSquare size={15} />
                  Reply
                </summary>
                <ResearchForm kind="message" replyId={m.id} />
              </details>
            </div>
            {data.versions
              .filter((v) => v.source_message === m.id)
              .map((v) => (
                <p key={v.id}>
                  <Link
                    className="inline-link"
                    href={`/findings/${v.finding_id}`}
                  >
                    Linked finding v{v.version}: {v.claim}
                  </Link>
                </p>
              ))}
          </article>
        ))}
        {profile ? (
          <ResearchForm kind="message" />
        ) : (
          <p className="notice">Set your profile above before posting.</p>
        )}
      </section>
      <section
        className="section"
        aria-label="Grind Intelligence evidence brief"
      >
        <h2>Grind Intelligence</h2>
        {brief.accepted.some(
          (a) =>
            data.profiles.find((p) => p.member_id === a.finding.author_id)
              ?.is_demo,
        ) && (
          <p className="sample-label">
            Includes illustrative QA records, not real research outcomes or
            customer validation.
          </p>
        )}
        <p className="muted">Accepted evidence brief</p>
        {!brief.accepted.length && (
          <p>
            No accepted findings visible yet. Discussion remains separate from
            evidence.
          </p>
        )}
        {brief.accepted.map(({ finding: f, version: v, uses }) => (
          <article className="record" key={f.id}>
            <Status value="accepted" />
            <h3>
              <Link href={`/findings/${f.id}`}>{v.claim}</Link>
            </h3>
            <Identity data={data} id={f.author_id} specialty={v.specialty} />
            <p>{v.addition}</p>
            <SourceLinks value={v.sources} />
            <p className="muted">Limitations: {v.limitations}</p>
            {v.correction && <p>Correction: {v.correction}</p>}
            {uses.map((u) => (
              <p key={u.id}>
                Used by {person(data, u.member_id)} (
                {specialtyLabel(u.specialty)}): {u.detail}
              </p>
            ))}
          </article>
        ))}
        {brief.lineage.length > 0 && (
          <>
            <h3>Source lineage</h3>
            <ul>
              {brief.lineage.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-link"
                  >
                    {new URL(l.url).hostname}
                  </a>
                  : {l.findings.length} linked finding(s), one source family.
                  Repetition is not independent confirmation.
                </li>
              ))}
            </ul>
          </>
        )}
        {brief.corrections.map((f) => (
          <p key={f.id}>
            <Link className="inline-link" href={`/findings/${f.id}`}>
              Unresolved:{" "}
              {data.versions.find((v) => v.id === f.current_version)?.claim}
            </Link>{" "}
            <Status value={f.status} />
          </p>
        ))}
        <h3>Remaining questions</h3>
        {brief.open.length ? (
          <ul>
            {brief.open.map((s) => (
              <li key={s}>
                {specialtyLabel(s)}: {gaps[s]}
              </li>
            ))}
          </ul>
        ) : (
          <p>
            All specialties have accepted coverage. Each finding&apos;s
            limitations still apply.
          </p>
        )}
      </section>
      <section className="section">
        <h2>Contribution record</h2>
        {data.findings.length ? (
          data.findings.map((f) => (
            <p key={f.id}>
              <Status value={f.status} />{" "}
              <Link className="inline-link" href={`/findings/${f.id}`}>
                {data.versions.find((v) => v.id === f.current_version)?.claim}
              </Link>
            </p>
          ))
        ) : (
          <p>No submitted contributions yet.</p>
        )}
      </section>
      <Assignment data={data} />
      <PeerRequests data={data} />
      <IllustrativeScenario />
    </>
  );
}
export function FindingEditor({
  data,
  sourceMessage,
  revise,
}: {
  data: ResearchData;
  sourceMessage?: string;
  revise?: string;
}) {
  const message = data.messages.find((m) => m.id === sourceMessage);
  const version = data.versions.find((v) => v.id === revise);
  const finding = data.findings.find((f) => f.id === version?.finding_id);
  if (
    (sourceMessage && !message) ||
    (revise &&
      (!version ||
        finding?.author_id !== data.memberId ||
        finding.current_version !== revise))
  )
    return <p className="notice">This source or revision is unavailable.</p>;
  if (!data.profiles.some((p) => p.member_id === data.memberId))
    return (
      <>
        <p>Set your display name and specialty before contributing.</p>
        <ResearchForm kind="profile" data={data} />
      </>
    );
  return (
    <section className="section">
      <h2>
        {version
          ? `Correct version ${version.version}`
          : "Address a gap with evidence"}
      </h2>
      {message && (
        <blockquote>
          Discussion by {person(data, message.author_id)}: {message.body}
          <p className="muted">
            The source message stays attributed to its author. Describe your own
            added work below.
          </p>
        </blockquote>
      )}
      <ResearchForm
        kind="submit"
        data={data}
        sourceMessage={sourceMessage}
        versionId={revise}
      />
    </section>
  );
}
export function FindingRecord({
  data,
  id,
}: {
  data: ResearchData;
  id: string;
}) {
  const finding =
    id === "latest" ? data.findings[0] : data.findings.find((f) => f.id === id);
  if (!finding)
    return (
      <section className="section">
        <h2>No visible contribution</h2>
        <Link className="button" href="/findings/new">
          <FilePlus2 size={16} />
          Contribute evidence
        </Link>
      </section>
    );
  const versions = data.versions
    .filter((v) => v.finding_id === finding.id)
    .sort((a, b) => b.version - a.version);
  const current = versions.find((v) => v.id === finding.current_version)!;
  const own = finding.author_id === data.memberId;
  return (
    <>
      <section className="section">
        <Status value={finding.status} />
        <h2 className="record-title">{current.claim}</h2>
        <Identity
          data={data}
          id={finding.author_id}
          specialty={current.specialty}
        />
        <p className="muted">
          Permissions:{" "}
          {finding.visibility === "members"
            ? "All members"
            : "Author + scoped review team"}
        </p>
        {own && finding.status !== "disputed" && (
          <Link className="button" href={`/findings/new?revise=${current.id}`}>
            <FilePlus2 size={16} />
            Submit a correction
          </Link>
        )}
        {!own && finding.status === "accepted" && (
          <details>
            <summary>Record cross-specialty usefulness</summary>
            <ResearchForm kind="useful" versionId={current.id} />
          </details>
        )}
        {["accepted", "needs_correction"].includes(finding.status) && (
          <details>
            <summary>Dispute this decision</summary>
            <ResearchForm kind="dispute" versionId={current.id} />
          </details>
        )}
      </section>
      {versions.map((v) => (
        <section className="section" key={v.id}>
          <div className="section-heading">
            <h2>Version {v.version}</h2>
            <Status
              value={v.id === current.id ? finding.status : "Superseded"}
            />
          </div>
          <p>{v.claim}</p>
          <h3>Contributor&apos;s addition</h3>
          <p className="preserve-lines">{v.addition}</p>
          <SourceLinks value={v.sources} />
          <p>
            <strong>Limitations:</strong> {v.limitations}
          </p>
          <p className="muted">
            Observed {date(v.observed_at)}; submitted {date(v.submitted_at)}
          </p>
          {v.correction && (
            <p>
              <strong>Correction:</strong> {v.correction}
            </p>
          )}
          {v.source_message && (
            <p>
              <Link
                className="inline-link"
                href={`/workbench#message-${v.source_message}`}
              >
                Original discussion and author
              </Link>
            </p>
          )}
          {v.related_version && (
            <p>
              <Link
                className="inline-link"
                href={`/findings/${data.versions.find((r) => r.id === v.related_version)?.finding_id ?? "latest"}`}
              >
                Related contribution
              </Link>
            </p>
          )}
          {data.decisions
            .filter((d) => d.version_id === v.id)
            .map((d) => (
              <blockquote key={d.id}>
                <strong>
                  {d.decision === "accept"
                    ? "Accepted"
                    : "Correction requested"}
                </strong>{" "}
                by {person(data, d.reviewer_id)}
                <p>Scope: {d.scope}</p>
                <p>{d.reason}</p>
                <p className="muted">
                  Conflicts: {d.conflicts}. {date(d.created_at)}
                </p>
              </blockquote>
            ))}
          {data.disputes
            .filter((d) => d.version_id === v.id)
            .map((d) => (
              <p key={d.id}>
                Dispute by {person(data, d.member_id)}: {d.reason} (
                {d.resolved_at ? "resolved" : "awaiting independent review"})
              </p>
            ))}
          {data.uses
            .filter((u) => u.version_id === v.id)
            .map((u) => (
              <p key={u.id}>
                Used by {person(data, u.member_id)}: {u.detail}
              </p>
            ))}
        </section>
      ))}
      {own && (
        <section className="section">
          <h2>Recognition</h2>
          {data.awards
            .filter((a) => a.finding_id === finding.id)
            .map((a) => (
              <p key={a.id}>
                {a.xp} lifetime XP and {a.points} {a.season} points, awarded
                once for version{" "}
                {versions.find((v) => v.id === a.version_id)?.version}.
              </p>
            ))}
          {!data.awards.some((a) => a.finding_id === finding.id) && (
            <p>No acceptance award yet.</p>
          )}
        </section>
      )}
      {data.assignment.assignee_id === data.memberId && own && (
        <section className="section">
          <h2>Assignment deliverable</h2>
          <ResearchForm kind="deliverAssignment" versionId={current.id} />
          <p>
            Payment: {data.assignment.payment_status}. Testnet assets have no
            monetary value.
          </p>
        </section>
      )}
      <Link className="button secondary" href="/workbench">
        Return to Workbench
        <ArrowRight size={16} />
      </Link>
    </>
  );
}
export function ReviewDesk({ data }: { data: ResearchData }) {
  const pending = data.assignments.filter(
    (a) => a.reviewer_id === data.memberId && !a.completed_at,
  );
  return (
    <>
      {data.roles.includes("steward") && (
        <section className="section">
          <h2>Independent Silver assessment</h2>
          <p>
            Assess member-visible accepted work against the published demo
            prerequisites. This is a human decision, not an automatic award.
          </p>
          <ResearchForm kind="promote" data={data} />
        </section>
      )}
      <section className="section">
        <h2>Your assigned reviews</h2>
        {!pending.length && (
          <p>
            No assigned reviews. A specialty or Silver tier alone does not grant
            review authority.
          </p>
        )}
        {pending.map((a) => {
          const v = data.versions.find((v) => v.id === a.version_id)!;
          return (
            <article className="record" key={a.id}>
              <Status
                value={
                  a.kind === "dispute"
                    ? "Independent dispute review"
                    : "Assigned review"
                }
              />
              <h3>
                <Link
                  className="inline-link"
                  href={`/findings/${v.finding_id}`}
                >
                  {v.claim} (v{v.version})
                </Link>
              </h3>
              <p>Assigned scope: {a.scope}</p>
              <p>{v.addition}</p>
              <SourceLinks value={v.sources} />
              <p>Limitations: {v.limitations}</p>
              <ResearchForm
                kind="review"
                versionId={v.id}
                assignmentId={a.id}
              />
            </article>
          );
        })}
      </section>
      <section className="section">
        <h2>Review queue</h2>
        {data.findings
          .filter((f) =>
            ["pending", "disputed", "needs_correction"].includes(f.status),
          )
          .map((f) => (
            <article className="record" key={f.id}>
              <Status value={f.status} />
              <p>
                <Link href={`/findings/${f.id}`} className="inline-link">
                  {data.versions.find((v) => v.id === f.current_version)?.claim}
                </Link>
              </p>
              <p className="muted">
                {data.assignments.some(
                  (a) => a.version_id === f.current_version && !a.completed_at,
                )
                  ? "Assigned to an authorized independent reviewer."
                  : "Awaiting an available scoped reviewer."}
              </p>
              {data.roles.includes("steward") &&
                ["pending", "disputed"].includes(f.status) && (
                  <ResearchForm kind="assign" versionId={f.current_version!} />
                )}
            </article>
          ))}
      </section>
    </>
  );
}
function Assignment({ data }: { data: ResearchData }) {
  const a = data.assignment;
  return (
    <section className="section">
      <div className="section-heading">
        <h2>One scoped assignment</h2>
        <span className="sample-label">Unfunded demonstration</span>
      </div>
      <h3>{a.deliverable}</h3>
      <p>Funder: {a.funder}</p>
      <p>{a.terms}</p>
      <p>{a.rights}</p>
      <p>{a.dispute_route}</p>
      <p>{a.compensation}</p>
      <dl className="metrics">
        <div>
          <dt>Work</dt>
          <dd>{a.work_status}</dd>
        </div>
        <div>
          <dt>Payment</dt>
          <dd>{a.payment_status}</dd>
        </div>
      </dl>
      {!a.assignee_id ? (
        <ResearchForm kind="claimAssignment" />
      ) : (
        <p>
          Claimed by {person(data, a.assignee_id)}.{" "}
          {a.assignee_id === data.memberId && (
            <Link className="inline-link" href="/findings/new">
              Prepare the deliverable
            </Link>
          )}
        </p>
      )}
      {a.version_id && (
        <Link
          className="inline-link"
          href={`/findings/${data.versions.find((v) => v.id === a.version_id)?.finding_id ?? "latest"}`}
        >
          Inspect deliverable and review
        </Link>
      )}
    </section>
  );
}
function PeerRequests({ data }: { data: ResearchData }) {
  return (
    <section className="section">
      <h2>Follow-up peer requests</h2>
      {data.requests.map((r) => (
        <article key={r.id} className="record">
          <Identity data={data} id={r.member_id} />
          <p>
            Seeking {specialtyLabel(r.specialty)}: {r.request}
          </p>
          <time>{date(r.created_at)}</time>
        </article>
      ))}
      {data.token.tier === "Silver" ? (
        <ResearchForm kind="peerRequest" />
      ) : (
        <p className="muted">
          Silver members can initiate a scoped peer request.{" "}
          <Link className="inline-link" href="/membership">
            View progression requirements
          </Link>
        </p>
      )}
    </section>
  );
}
export function MembershipProgress({ data }: { data: ResearchData }) {
  const c = credit(data);
  const own = data.findings.filter((f) => f.author_id === data.memberId);
  const accepted = own.filter((f) => f.status === "accepted");
  const promotionEligible = accepted.filter((f) => f.visibility === "members");
  const uses = data.uses.filter((u) =>
    promotionEligible.some((f) => f.current_version === u.version_id),
  );
  const explorer = "https://explorer.testnet.chain.robinhood.com";
  return (
    <>
      <section className="section">
        <h2>{data.token.tier}</h2>
        <div className="form-actions">
          <a
            className="inline-link"
            href={`${explorer}/token/${data.token.contract}/instance/${data.token.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Token #{data.token.id}
          </a>
          <a
            className="inline-link"
            href={`${explorer}/address/${data.token.contract}`}
            target="_blank"
            rel="noreferrer"
          >
            {data.token.contract}
          </a>
          {data.token.mint && (
            <a
              className="inline-link"
              href={`${explorer}/tx/${data.token.mint}`}
              target="_blank"
              rel="noreferrer"
            >
              Mint transaction
            </a>
          )}
        </div>
        <dl className="metrics">
          <div>
            <dt>Lifetime XP</dt>
            <dd>{c.xp}</dd>
          </div>
          <div>
            <dt>{data.policy.season} points</dt>
            <dd>{c.points}</dd>
          </div>
          <div>
            <dt>Accepted contributions</dt>
            <dd>{accepted.length}</dd>
          </div>
        </dl>
        <p className="muted">
          Credit belongs to your member identity, not the transferable NFT. No
          cash or token conversion is promised.
        </p>
      </section>
      <section className="section">
        <h2>Silver: published demo requirements</h2>
        <ul>
          <li>
            {c.xp} / {data.policy.silver_xp} lifetime XP
          </li>
          <li>
            {promotionEligible.length} / {data.policy.silver_findings} currently
            accepted member-visible findings
          </li>
          <li>
            {uses.length} / {data.policy.silver_uses} documented cross-specialty
            uses
          </li>
          <li>
            Independent steward assessment of evidence, limitations and
            attribution
          </li>
        </ul>
        <p>
          Qualifying does not promote you automatically. A steward must approve
          the current member, token and ownership epoch. Silver enables a
          follow-up peer request.
        </p>
        <p className="muted">
          Demo award: {data.policy.acceptance_xp} XP and{" "}
          {data.policy.acceptance_points} seasonal points for the first accepted
          version of a finding. Routine revisions, messages and likes earn no
          additional award.
        </p>
      </section>
      <section className="section">
        <h2>Your contribution history</h2>
        {!own.length && (
          <p>Your first contribution starts with an evidence gap.</p>
        )}
        {own.map((f) => (
          <p key={f.id}>
            <Status value={f.status} />{" "}
            <Link className="inline-link" href={`/findings/${f.id}`}>
              {data.versions.find((v) => v.id === f.current_version)?.claim}
            </Link>
          </p>
        ))}
        <Link className="button" href="/workbench">
          Return to Workbench
          <ArrowRight size={16} />
        </Link>
      </section>
      <PeerRequests data={data} />
    </>
  );
}
