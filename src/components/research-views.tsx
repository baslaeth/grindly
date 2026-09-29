import Link from "next/link";
import {
  ArrowRight,
  FilePlus2,
  ExternalLink,
  Search,
  ScanLine,
  ListChecks,
  CheckCircle2,
  Clock3,
  CircleAlert,
  Fingerprint,
} from "lucide-react";
import { WorkbenchSections } from "./workbench-sections";
import { RoomChat } from "./room-chat";
import { AlphaForm } from "./alpha-form";
import { AlphaDetails, CategoryHistory, SharedAlpha } from "./alpha-views";
import { nextRank } from "@/research/spaces";
import { MemberActivity } from "./member-activity";
import { ResearchForm, RefreshResearch } from "./research-forms";
import { RankSpace, MemberDirectory, profileHref } from "./rank-space";
import {
  credit,
  roomData,
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
      {data.directory?.some((p) => p.id === id) ? (
        <Link href={profileHref(data.question.id, id)}>
          <strong>{person(data, id)}</strong>
        </Link>
      ) : (
        <strong>{person(data, id)}</strong>
      )}
      {profile?.is_demo && (
        <span className="sample-label">Illustrative QA persona</span>
      )}
      <Specialty value={specialty ?? profile?.specialty ?? ""} />
      <span className="rank-label">
        <Fingerprint size={13} aria-hidden="true" />
        {data.tiers[id] ?? "Membership not checked"}
      </span>
    </div>
  );
}
function Specialty({ value }: { value: string }) {
  const Icon =
    value === "operations" ? ListChecks : value === "risk" ? ScanLine : Search;
  return (
    <span className={`specialty ${value}`}>
      <Icon size={14} aria-hidden="true" />
      {specialtyLabel(value)}
    </span>
  );
}
function Status({ value }: { value: string }) {
  const Icon =
    value === "accepted"
      ? CheckCircle2
      : ["needs_correction", "disputed"].includes(value)
        ? CircleAlert
        : Clock3;
  return (
    <span
      className={`status-label ${["pending", "accepted", "needs_correction", "disputed"].includes(value) ? value : ""}`}
    >
      <Icon size={13} aria-hidden="true" />
      {(
        {
          pending: "Pending evaluation",
          needs_correction: "Needs correction",
          accepted: "Accepted",
          rejected: "Rejected with feedback",
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
            <Specialty value={p.specialty} />
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
    </section>
  );
}
export function Workbench({
  data,
  profileId,
}: {
  data: ResearchData;
  profileId?: string;
}) {
  return (
    <RankSpace data={data} profileId={profileId}>
      <RoomWorkbench key={data.question.id} data={roomData(data)} />
    </RankSpace>
  );
}
function RoomWorkbench({ data }: { data: ResearchData }) {
  const brief = evidenceBrief(data);
  const profile = data.profiles.find((p) => p.member_id === data.memberId);
  const gaps = data.question.gaps as Record<string, string>;
  return (
    <>
      <div className="room-tools">
        <Link
          href={`/findings/new?room=${data.question.id}`}
          className="inline-link"
        >
          <FilePlus2 size={16} />
          Submit alpha
        </Link>
        <a className="inline-link" href="#evidence-brief">
          Current accepted evidence brief <ArrowRight size={16} />
        </a>
        {data.roles.includes("reviewer") && (
          <Link href="/review" className="inline-link">
            <ListChecks size={16} />
            Review Desk
          </Link>
        )}
      </div>
      <details className="room-question">
        <summary>Research question and open gaps</summary>
        <section className="section question">
          <p className="eyebrow">One shared research question</p>
          <div className="section-heading">
            <h2>{data.question.title}</h2>
            <RefreshResearch />
          </div>
          <p>{data.question.purpose}</p>
          <dl
            className="coverage"
            aria-label="Specialty coverage and open questions"
          >
            {Object.entries(gaps).map(([key, gap]) => (
              <div key={key}>
                <dt>
                  <Specialty value={key} />
                </dt>
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
      </details>
      <WorkbenchSections
        participants={
          <>
            <MemberDirectory data={data} />
            <details open={!profile}>
              <summary>
                {profile
                  ? "Edit your specialist profile"
                  : "Set your name and specialty"}
              </summary>
              <ResearchForm kind="profile" data={data} />
            </details>
          </>
        }
        discussion={
          <>
            <SharedAlpha data={data} />
            <RoomChat
              key={`${data.memberId}:${data.question.id}`}
              room={data.question.id}
              memberId={data.memberId}
              rank={data.token.tier}
              category={data.question.category}
              canPost={!!profile}
            />
          </>
        }
        evidence={
          <section
            className="section"
            aria-label="Grind Intelligence evidence brief"
            id="evidence-brief"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Accepted work, connected</p>
                <h2>Grind Intelligence</h2>
              </div>
              <span className="muted">
                Sources and people, not an AI verdict
              </span>
            </div>
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
            <p className="muted">
              Accepted evidence brief. Assembled from permitted, currently
              accepted findings. Discussion is not evidence until independently
              reviewed.
            </p>
            {!brief.accepted.length && (
              <p>
                No accepted findings visible yet. Discussion remains separate
                from evidence.
              </p>
            )}
            {brief.accepted.map(({ finding: f, version: v, uses }) => (
              <article className="record" key={f.id}>
                <Status value="accepted" />
                <h3>
                  <Link href={`/findings/${f.id}`}>{v.claim}</Link>
                </h3>
                <Identity
                  data={data}
                  id={f.author_id}
                  specialty={v.specialty}
                />
                <p>{v.addition}</p>
                <SourceLinks value={v.sources} />
                <p className="muted">Limitations: {v.limitations}</p>
                {v.correction && <p>Correction: {v.correction}</p>}
                {uses.map((u) => (
                  <p key={u.id}>
                    Used by {person(data, u.member_id)} (
                    {specialtyLabel(u.specialty)}): {u.detail}
                    {u.is_demo && (
                      <span className="sample-label">
                        Illustrative QA usefulness
                      </span>
                    )}
                    {!u.qualifies && (
                      <span className="muted">
                        {" "}
                        Historical attribution only; not qualifying promotion
                        evidence.
                      </span>
                    )}
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
                      : {l.findings.length} linked finding(s), one source
                      family. Repetition is not independent confirmation.
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
        }
        record={
          <section className="section">
            <h2>Contribution record</h2>
            {data.findings.length ? (
              data.findings.map((f) => (
                <p key={f.id}>
                  <Status value={f.status} />{" "}
                  <Link className="inline-link" href={`/findings/${f.id}`}>
                    {
                      data.versions.find((v) => v.id === f.current_version)
                        ?.claim
                    }
                  </Link>
                </p>
              ))
            ) : (
              <p>No submitted contributions yet.</p>
            )}
          </section>
        }
        opportunities={
          <>
            {data.assignment && <Assignment data={data} />}
            <PeerRequests data={data} />
          </>
        }
      />
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
      <p className="muted">
        {version
          ? "A correction creates a new linked version. Earlier claims, sources and review decisions remain in the record."
          : "A useful finding makes one claim, supports it with sources, and makes your own contribution clear."}
      </p>
      {message && data.alphaSchemaAvailable === false && (
        <blockquote>
          Discussion by {person(data, message.author_id)}: {message.body}
          <p className="muted">
            The source message stays attributed to its author. Describe your own
            added work below.
          </p>
        </blockquote>
      )}
      <div className="editor-layout">
        {data.alphaSchemaAvailable === false ? (
          <div>
            <p className="notice">
              Category alpha and preliminary review await the shared-database
              update. The existing contribution flow remains available.
            </p>
            <ResearchForm
              kind="submit"
              data={data}
              sourceMessage={sourceMessage}
              versionId={revise}
            />
          </div>
        ) : (
          <AlphaForm
            data={data}
            sourceMessage={sourceMessage}
            versionId={revise}
          />
        )}
        <aside className="editor-aside">
          <h3>From contribution to credit</h3>
          <ol>
            <li>A submitted version is a record, not accepted evidence.</li>
            <li>
              An assigned independent reviewer checks its scope and limitations.
            </li>
            <li>
              Credit requires an approved award rule. Corrections retain the
              earlier history.
            </li>
          </ol>
          <Link className="inline-link" href="/workbench">
            Return to the research question
          </Link>
        </aside>
      </div>
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
        <p className="notice">
          {finding.status === "needs_correction"
            ? "Next: the author submits a corrected version for independent review."
            : finding.status === "accepted"
              ? "Accepted within the recorded review scope. Use the sources, note the limitations, and document how this helps your specialty."
              : finding.status === "disputed"
                ? "Next: an independent authorized reviewer assesses the dispute. This work is not currently accepted evidence."
                : finding.status === "rejected"
                  ? "Review declined with reasons. The author can correct the work or request an independent appeal."
                  : "Next: an assigned authorized reviewer assesses this exact version. No acceptance credit is confirmed yet."}
        </p>
        <Identity
          data={data}
          id={finding.author_id}
          specialty={current.specialty}
        />
        <p className="muted">
          Permissions:{" "}
          {finding.visibility === "members"
            ? "Permitted members in this exact rank"
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
        {!data.alphas?.some((a) => a.version_id === current.id) &&
          ["accepted", "needs_correction"].includes(finding.status) && (
            <details>
              <summary>Dispute this decision</summary>
              <ResearchForm kind="dispute" versionId={current.id} />
            </details>
          )}
      </section>
      <div className="section-heading">
        <h2>Evidence and version history</h2>
        <span className="muted">
          Current version first. Earlier records remain intact.
        </span>
      </div>
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
            Submitted by server {date(v.submitted_at)}
            {!data.alphas?.some((a) => a.version_id === v.id) &&
              `; observed ${date(v.observed_at)} (self-reported)`}
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
                href={`/workbench?room=${data.question.id}#message-${v.source_message}`}
              >
                Original discussion and author
              </Link>
            </p>
          )}
          {data.sourceSnapshots
            ?.filter((s) => s.version === v.id)
            .map((s) => (
              <blockquote key={s.revision}>
                <p>Source version by {person(data, s.author)}</p>
                <p>{s.body}</p>
                {s.attachments?.map((a) => (
                  <p key={a.id}>
                    <a
                      className="inline-link"
                      href={`/api/chat/media?id=${a.id}&version=${v.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View preserved source{" "}
                      {a.type === "image/gif" ? "GIF" : "image"}
                    </a>
                  </p>
                ))}
                <small>Preserved when this alpha version was submitted.</small>
              </blockquote>
            ))}
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
                  {d.decision === "reject"
                    ? "Rejected with reason"
                    : d.decision === "accept"
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
                {u.is_demo && (
                  <span className="sample-label">
                    Illustrative QA usefulness
                  </span>
                )}
                {!u.qualifies && (
                  <span className="muted">
                    {" "}
                    Historical attribution only; not qualifying promotion
                    evidence.
                  </span>
                )}
              </p>
            ))}
          <AlphaDetails data={data} version={v.id} />
        </section>
      ))}
      {own && (
        <section className="section">
          <h2>Recognition</h2>
          <p className="muted">
            Acceptance credit is not payment or automatic promotion. Review
            scope and documented usefulness remain part of the record.
          </p>
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
      {data.assignment?.assignee_id === data.memberId && own && (
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
        Return to Hub
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
        <p className="muted">
          Assess the exact claim and its evidence within your assigned scope.
          Request a correction when an important gap remains.
        </p>
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
              <p className="decision-context">
                <strong>Assigned scope:</strong> {a.scope}
              </p>
              <h3>What the contributor added</h3>
              <p>{v.addition}</p>
              <h3>Evidence</h3>
              <SourceLinks value={v.sources} />
              <p>Limitations: {v.limitations}</p>
              <AlphaDetails data={data} version={v.id} />
              <ResearchForm
                kind="review"
                data={data}
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
                {f.status === "needs_correction"
                  ? "The author must submit a corrected version."
                  : data.assignments.some(
                        (a) =>
                          a.version_id === f.current_version && !a.completed_at,
                      )
                    ? "Assigned to an authorized independent reviewer."
                    : "Awaiting an available scoped reviewer."}
              </p>
              {f.status === "needs_correction" &&
                f.author_id === data.memberId && (
                  <Link
                    className="inline-link"
                    href={`/findings/new?revise=${f.current_version}`}
                  >
                    Submit a correction
                  </Link>
                )}
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
  if (!a)
    return (
      <section className="section">
        <h2>Scoped assignment</h2>
        <p>No assignment is configured in this room.</p>
      </section>
    );
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
        <ResearchForm kind="peerRequest" data={data} />
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
  const profile = data.profiles.find((p) => p.member_id === data.memberId);
  const next = nextRank(data.token.tier);
  const explorer = "https://explorer.testnet.chain.robinhood.com";
  return (
    <>
      <section className="section profile-intro">
        <h2>{profile?.display_name ?? "Your profile"}</h2>
        <p>{profile?.bio || "No bio shared yet."}</p>
        <p>{profile?.interest ?? "Interests not set"}</p>
        <details>
          <summary>Edit profile</summary>
          <ResearchForm kind="profile" data={data} />
        </details>
      </section>
      <section className="section">
        <p className="eyebrow">Current membership / live ownership verified</p>
        <div className="membership-heading">
          <Fingerprint aria-hidden="true" />
          <div>
            <h2>{data.token.tier}</h2>
            <span className="muted">
              Your access credential. Your history stays with you.
            </span>
          </div>
        </div>
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
            <dt>Seasonal points</dt>
            <dd>{c.points}</dd>
          </div>
          <div>
            <dt>Accepted contributions</dt>
            <dd>{accepted.length}</dd>
          </div>
        </dl>
        <p className="muted">
          Credit belongs to your member identity, not the transferable NFT. The
          NFT retains its tier when sold; its buyer does not inherit your
          personal XP, contributions or earned balances. No cash or token
          conversion is promised.
        </p>
      </section>
      <section className="section">
        <h2>Your NFT progression</h2>
        <div className="tier-path">
          <div>
            <Fingerprint size={24} />
            <strong>{data.token.tier}</strong>
            <span>Current NFT</span>
          </div>
          {next && (
            <>
              <ArrowRight aria-hidden="true" />
              <div>
                <strong>{next}</strong>
                <span>Next tier</span>
              </div>
            </>
          )}
        </div>
        {next ? (
          <dl className="metrics">
            <div>
              <dt>XP threshold</dt>
              <dd>To finalize</dd>
            </div>
            <div>
              <dt>Token burn</dt>
              <dd>To finalize</dd>
            </div>
          </dl>
        ) : (
          <p>Diamond is the final rank. No further rank is configured.</p>
        )}
        <p>
          Progression is a human decision. No automatic upgrade or token
          transaction is active.
        </p>
        <p>
          Silver members can initiate a peer request for complementary
          expertise.
        </p>
        <p className="muted">
          Personal XP and delegated NFT progress are separate. No delegated
          credit or current delegates are recorded for this account.
        </p>
        <details>
          <summary>Evaluation award policy</summary>
          <p>
            Existing illustrative policy: {data.policy.acceptance_xp} XP and{" "}
            {data.policy.acceptance_points} seasonal points on the first
            accepted version. Corrections, messages and reactions do not
            duplicate this award. Production economics remain to finalize.
          </p>
        </details>
      </section>
      <section className="section">
        <h2>Claim $GRIND</h2>
        <button className="button" disabled aria-describedby="claims-inactive">
          Claim $GRIND
        </button>
        <p id="claims-inactive">Claims are not active yet.</p>
      </section>
      <MemberActivity data={data} />
      <CategoryHistory data={data} member={data.memberId} />
      <section className="section">
        <h2>Your contribution history in this rank</h2>
        <p className="muted">
          Personal XP includes your recorded lifetime credit. Other-rank records
          remain preserved but are not exposed in this space.
        </p>
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
          Return to Hub
          <ArrowRight size={16} />
        </Link>
      </section>
      <PeerRequests data={data} />
    </>
  );
}
