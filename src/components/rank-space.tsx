import Link from "next/link";
import type { ReactNode } from "react";
import { Users, ArrowRight, ShieldCheck, Hash } from "lucide-react";
import {
  credit,
  profileHistory,
  type ResearchData,
} from "@/research/model";
import { acquisitionLabel } from "@/research/spaces";
import { ProfileDrawer, RoomSelector, RoomUnread } from "./space-controls";
import { CategoryHistory } from "./alpha-views";
import { primaryFocus } from "@/alpha/checklists";

export const profileHref = (room: string, id: string) =>
  `/workbench?room=${encodeURIComponent(room)}&profile=${encodeURIComponent(id)}`;
function recordedSpecialty(data: ResearchData, id: string, fallback: string) {
  const profile = data.profiles.find((p) => p.member_id === id);
  return profile ? primaryFocus(profile) ?? "Focus not selected" : fallback;
}
function Avatar({ name }: { name: string }) {
  return (
    <span className="profile-avatar" aria-hidden="true">
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function MemberDirectory({ data }: { data: ResearchData }) {
  const people = data.directory ?? [];
  const genuine = people.filter((p) => !p.is_demo).length;
  const qa = people.length - genuine;
  return (
    <section className="section" id="space-members" aria-label="Space members">
      <h2>
        <Users size={18} aria-hidden="true" /> {data.token.tier} members
      </h2>
      <p>
        {genuine} member{genuine === 1 ? "" : "s"}
        {qa > 0 && `; ${qa} isolated sample account${qa === 1 ? "" : "s"}`}
      </p>
      <a className="inline-link" href="#discussion">
        Back to chat <ArrowRight size={14} />
      </a>
      <ul className="member-directory">
        {people.map((p) => (
          <li key={p.id}>
            <Link
              href={profileHref(data.question.id, p.id)}
              className="member-link"
            >
              <Avatar name={p.name} />
              <span>
                <strong>{p.name}</strong>
                <span>{recordedSpecialty(data, p.id, p.specialty)}</span>
              </span>
            </Link>
            <span className="rank-label">{p.tier} NFT</span>
            {p.is_demo && <span className="sample-label">Isolated sample</span>}
          </li>
        ))}
      </ul>
      {!!data.demoProfiles?.length && (
        <>
          <h3>Fictional specialist examples</h3>
          <p className="sample-label">
            {data.demoProfiles?.length ?? 0} demo profiles in this space. Not
            members, traction or earned credit.
          </p>
          <ul className="member-directory">
            {data.demoProfiles?.map((p) => (
              <li key={p.id}>
                <Link
                  className="member-link"
                  href={profileHref(data.question.id, `demo-${p.id}`)}
                >
                  <Avatar name={p.name} />
                  <span>
                    <strong>{p.name}</strong>
                    <span>{p.specialty}</span>
                  </span>
                </Link>
                <span className="sample-label">Fictional {p.rank}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
export function DemoConversation({ data }: { data: ResearchData }) {
  const messages =
    data.demoMessages?.filter((m) => m.question_id === data.question.id) ?? [];
  if (!messages.length) return null;
  return (
    <details className="demo-conversation" open>
      <summary>
        Illustrative specialist exchange{" "}
        <span className="sample-label">Fictional conversation</span>
      </summary>
      <p className="muted">
        An example of complementary help. These messages are not findings and
        earn no XP.
      </p>
      {messages.map((m) => {
        const author = data.demoProfiles!.find((p) => p.id === m.author_id)!;
        const grant = data.demoDelegations?.find(
          (d) => d.id === m.delegation_id && d.delegate_id === m.author_id,
        );
        const owner = data.demoProfiles?.find((p) => p.id === grant?.owner_id);
        return (
          <article
            className={`message ${m.reply_to ? "reply" : ""}`}
            key={m.id}
          >
            <div className="byline">
              <Link href={profileHref(data.question.id, `demo-${author.id}`)}>
                <strong>{author.name}</strong>
              </Link>
              {owner && (
                <span>
                  {" "}
                  - working for{" "}
                  <Link
                    href={profileHref(data.question.id, `demo-${owner.id}`)}
                  >
                    {owner.name}&apos;s NFT
                  </Link>
                </span>
              )}
              <span className="specialty">{author.specialty}</span>
              <span className="sample-label">Demo</span>
            </div>
            {m.reply_to && (
              <span className="muted">
                Reply to{" "}
                {
                  data.demoProfiles?.find(
                    (p) =>
                      p.id ===
                      messages.find((parent) => parent.id === m.reply_to)
                        ?.author_id,
                  )?.name
                }
              </span>
            )}
            <p>{m.body}</p>
          </article>
        );
      })}
    </details>
  );
}
function Profile({ data, id }: { data: ResearchData; id: string }) {
  const example = data.demoProfiles?.find((p) => `demo-${p.id}` === id);
  const member = data.directory?.find((p) => p.id === id);
  if (!member && !example) return null;
  const name = example?.name ?? member!.name;
  const grants = example
    ? (data.demoDelegations?.filter(
        (d) => d.owner_id === example.id || d.delegate_id === example.id,
      ) ?? [])
    : [];
  const contributed = example
    ? grants
        .filter((d) => d.delegate_id === example.id)
        .reduce((n, d) => n + d.nft_xp, 0)
    : 0;
  const towardNFT = example
    ? grants
        .filter((d) => d.owner_id === example.id)
        .reduce((n, d) => n + d.nft_xp, 0)
    : 0;
  const history = member
    ? profileHistory(data, member.id)
    : { findings: [], reviews: [] };
  return (
    <ProfileDrawer
      key={id}
      back={`/workbench?room=${encodeURIComponent(data.question.id)}#discussion`}
    >
      <Avatar name={name} />
      <h2 id="profile-title">{name}</h2>
      {(example || member?.is_demo) && (
        <p className="sample-label">
          {example
            ? "Fictional profile, XP and NFT history"
            : "Isolated sample account and test activity"}
        </p>
      )}
      <p>{(example?.bio ?? member!.bio) || "No bio shared yet."}</p>
      <p className="specialty">
        {example?.specialty ??
          recordedSpecialty(data, member!.id, member!.specialty)}
      </p>
      <p className="muted">
        Self-described specialty, not reviewer authority or proof of expertise.
      </p>
      <section className="section">
        <h3>
          <ShieldCheck size={18} /> {example?.rank ?? member!.tier} NFT
        </h3>
        {member ? (
          <a
            className="inline-link"
            href={`https://explorer.testnet.chain.robinhood.com/token/${member.contract}/instance/${member.token}`}
            target="_blank"
            rel="noreferrer"
          >
            Inspect NFT #{member.token}
          </a>
        ) : (
          <p>Illustrative NFT owned by {name}; not an on-chain token.</p>
        )}
        <h4>Recorded acquisition and NFT progression</h4>
        {example ? (
          <p>
            {
              acquisitionLabel[
                example.acquisition as keyof typeof acquisitionLabel
              ]
            }{" "}
            (illustrative)
          </p>
        ) : (
          <ul>
            {!member!.acquisitions.length && !member!.progression.length && (
              <li>
                No acquisition or progression history recorded. Provenance is
                unknown.
              </li>
            )}
            {member!.acquisitions.map((e, i) => (
              <li key={i}>
                {acquisitionLabel[e.kind]} - {e.at.slice(0, 10)}
              </li>
            ))}
            {member!.progression.map((e, i) => (
              <li key={`p${i}`}>
                NFT progressed to {e.tier} - {e.at.slice(0, 10)}. This is NFT
                history, not an achievement inherited by its buyer.
              </li>
            ))}
          </ul>
        )}
        <p className="muted">
          Tier stays with the NFT on sale. Personal work, XP and earned balances
          do not.
        </p>
      </section>
      <section className="section">
        <h3>
          {example
            ? "Illustrative credit attribution"
            : "Recorded personal credit"}
        </h3>
        <dl className="metrics">
          <div>
            <dt>Personally earned XP</dt>
            <dd>{example?.personal_xp ?? member!.personal_xp}</dd>
          </div>
          <div>
            <dt>Delegated XP toward this NFT</dt>
            <dd>{towardNFT}</dd>
          </div>
          <div>
            <dt>Work toward another NFT</dt>
            <dd>{contributed}</dd>
          </div>
        </dl>
        <p className="muted">
          Delegated progress is separate, never added to the owner&apos;s
          personal XP.{" "}
          {example
            ? "All numbers in this profile are fictional examples."
            : "Delegated-work accounting is not active; no delegated XP has been awarded."}
        </p>
        <h4>Current and past delegates</h4>
        {grants.length ? (
          grants.map((d) => {
            const delegate = data.demoProfiles!.find(
              (p) => p.id === d.delegate_id,
            )!;
            const owner = data.demoProfiles!.find((p) => p.id === d.owner_id)!;
            return (
              <p key={d.id}>
                <span className="sample-label">{d.status} demo</span>{" "}
                <Link
                  href={profileHref(data.question.id, `demo-${delegate.id}`)}
                >
                  {delegate.name}
                </Link>{" "}
                - working for{" "}
                <Link href={profileHref(data.question.id, `demo-${owner.id}`)}>
                  {owner.name}&apos;s NFT
                </Link>
                . {d.nft_xp} illustrative NFT XP.
              </p>
            );
          })
        ) : (
          <p>
            No delegation recorded. Live delegation and reward splits are not
            active.
          </p>
        )}
      </section>
      {member && <CategoryHistory data={data} member={member.id} />}
      <section className="section">
        <h3>Attributed work in this space</h3>
        {history.findings.map((f) => (
          <p key={f.id}>
            <span className="status-label">
              {f.status.replaceAll("_", " ")}
            </span>{" "}
            <Link href={`/findings/${f.id}`}>
              {data.versions.find((v) => v.id === f.current_version)?.claim}
            </Link>
          </p>
        ))}
        {!history.findings.length && (
          <p>
            {example
              ? "Conversation examples only. No accepted findings or earned review outcomes are claimed."
              : "No shared contributions visible in this rank yet."}
          </p>
        )}
        {member && (
          <details className="profile-history">
            <summary>Discussion contributions</summary>
            {data.messages.filter((m) => m.author_id === member.id).length ===
              0 && <p>No messages recorded in this rank.</p>}
            {data.messages
              .filter((m) => m.author_id === member.id)
              .map((m) => (
                <p key={m.id}>
                  <Link
                    href={`/workbench?room=${encodeURIComponent(m.question_id)}#message-${m.id}`}
                  >
                    {m.body}
                  </Link>
                  <span className="muted">
                    {" "}
                    {m.created_at.slice(0, 10)}. Discussion, not accepted
                    evidence.
                  </span>
                </p>
              ))}
          </details>
        )}
        <details className="profile-history">
          <summary>Review history</summary>
          {history.reviews.length === 0 && (
            <p>No permitted review history recorded in this rank.</p>
          )}
          {history.reviews.map(({ decision, version, finding }) => (
            <article key={decision.id} className="record">
              <p>
                {decision.reviewer_id === member?.id
                  ? "Reviewed by this member"
                  : "Review of this member's work"}
              </p>
              <Link href={`/findings/${finding.id}`}>
                {version.claim} (v{version.version})
              </Link>
              <p>
                {decision.decision === "accept"
                  ? "Accepted within scope"
                  : decision.decision === "reject"
                    ? "Rejected with reason"
                    : "Correction requested"}{" "}
                - {decision.created_at.slice(0, 10)}
              </p>
              <p>{decision.scope}</p>
              <p>{decision.reason}</p>
            </article>
          ))}
        </details>
        {example &&
          data.demoMessages
            ?.filter((m) => m.author_id === example.id)
            .map((m) => (
              <blockquote key={m.id}>
                {m.body}
                <p className="sample-label">
                  Illustrative discussion; not reviewed evidence
                </p>
              </blockquote>
            ))}
        <p className="muted">
          Private records and another rank&apos;s conversations are not
          included.
        </p>
      </section>
    </ProfileDrawer>
  );
}
export function RankSpace({
  data,
  profileId,
  children,
}: {
  data: ResearchData;
  profileId?: string;
  children: ReactNode;
}) {
  const c = credit(data);
  const directory = data.directory ?? [];
  const genuineCount = directory.filter((p) => !p.is_demo).length;
  return (
    <>
      <header className="rank-space-heading">
        <div>
          <h2>{data.question.category}</h2>
          <p className="member-count" aria-label="Current rank member count">
            {genuineCount} {genuineCount === 1 ? "member" : "members"}
            {directory.some((p) => p.is_demo) &&
              `; ${directory.filter((p) => p.is_demo).length} isolated sample accounts`}
          </p>
          <a className="button secondary" href="#space-members">
            <Users size={16} />
            Members
          </a>
        </div>
        <aside className="space-progress" aria-label="Your progress">
          <h3>Your progress</h3>
          <strong>{c.xp} personally earned XP</strong>
          <Link className="inline-link" href="/membership">
            Your recorded history <ArrowRight size={14} />
          </Link>
        </aside>
      </header>
      <div className="rank-room-layout">
        <aside className="room-sidebar">
          <h3>Rooms</h3>
          <nav aria-label={`${data.token.tier} rooms`}>
            {data.rooms?.map((r) => (
              <Link
                key={r.id}
                href={`/workbench?room=${r.id}#discussion`}
                prefetch={false}
                aria-current={r.id === data.question.id ? "page" : undefined}
              >
                <Hash size={14} />
                <span>{r.category}</span>
                <RoomUnread room={r.id} />
              </Link>
            ))}
          </nav>
        </aside>
        <div className="room-content">
          <RoomSelector rooms={data.rooms ?? []} selected={data.question.id} />
          {children}
        </div>
      </div>
      {profileId && <Profile data={data} id={profileId} />}
    </>
  );
}
