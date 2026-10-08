import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Coins,
  FilePlus2,
  Gem,
  Layers,
  ListChecks,
  Network,
  PackageOpen,
  Rocket,
  Search,
  Share2,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { categories } from "@/research/spaces";
import { RankBadges } from "./rank-progression";

const steps = [
  {
    icon: Gem,
    title: "Get NFT membership",
    text: "Invitation, email and wallet verification. Mint or bind a testnet NFT.",
  },
  {
    icon: Users,
    title: "Enter your rank",
    text: "Meet members across nine specialties in your rank's rooms.",
  },
  {
    icon: Share2,
    title: "Share useful alpha",
    text: "Bring a finding, a practical guide or a warning, with evidence.",
  },
  {
    icon: ShieldCheck,
    title: "Independent evaluation",
    text: "An authorized reviewer checks your work.",
  },
  {
    icon: BadgeCheck,
    title: "Earn qualifying XP",
    text: "Approved work builds your personal contribution record.",
  },
  {
    icon: TrendingUp,
    title: "Progress toward higher ranks",
    text: "Track XP requirements. NFT upgrade execution is not live yet.",
  },
];
const specialties = [
  { icon: ListChecks, text: "Entry requirements" },
  { icon: PackageOpen, text: "Participation routes" },
  { icon: Rocket, text: "Sale terms and risks" },
  { icon: Zap, text: "Fast-moving signals" },
  { icon: TrendingUp, text: "Market setups" },
  { icon: Search, text: "Project research" },
  { icon: Sprout, text: "Early-stage diligence" },
  { icon: Gem, text: "Collections and utility" },
  { icon: Layers, text: "Emerging themes" },
];

export function HomeEcosystem({
  rooms = [],
  rank,
}: {
  rooms?: { id: string; category: string }[];
  rank?: string;
}) {
  return (
    <div className="home-ecosystem">
      <section className="section" aria-labelledby="member-journey-title">
        <div className="section-heading">
          <h2 id="member-journey-title">From membership to reputation</h2>
          <span className="status-label">Testnet pilot</span>
        </div>
        <ol className="member-journey" aria-label="Member journey">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <li key={title}>
              <div className="journey-node">
                <Icon size={25} aria-hidden="true" />
                <span>{index + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              {index < steps.length - 1 && (
                <ArrowRight
                  className="journey-arrow"
                  size={18}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
        <div className="future-conversion">
          <Coins size={26} aria-hidden="true" />
          <div>
            <strong>
              XP <span aria-hidden="true">&rarr;</span> $GRIND
            </strong>
            <p>
              Planned separately. Conversion, token claims and earning features
              are not available.
            </p>
          </div>
          <span className="status-label">Planned</span>
        </div>
      </section>
      <section
        className="section specialty-collaboration"
        aria-labelledby="specialties-title"
      >
        <div className="collaboration-heading">
          <Network size={30} aria-hidden="true" />
          <div>
            <h2 id="specialties-title">Nine specialties. Shared knowledge.</h2>
            <p>
              Contribute your expertise. Build on someone else&apos;s research.
            </p>
          </div>
        </div>
        <div className="collaboration-boundary">
          <Users size={18} aria-hidden="true" />
          <strong>
            {rank
              ? `Inside your ${rank} community`
              : "Inside your own rank's community"}
          </strong>
          <span>General + nine category rooms</span>
        </div>
        <ul className="specialty-grid">
          {categories.map((category, index) => {
            const { icon: Icon, text } = specialties[index] ?? {
              icon: Share2,
              text: "Shared research",
            };
            const room = rooms.find((r) => r.category === category);
            return (
              <li key={category}>
                <Link href={room ? `/workbench?room=${room.id}` : "/join"}>
                  <Icon size={23} aria-hidden="true" />
                  <span>
                    <strong>{category}</strong>
                    <small>{text}</small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="collaboration-footer">
          <Share2 size={17} aria-hidden="true" /> Research{" "}
          <span aria-hidden="true">&harr;</span> questions{" "}
          <span aria-hidden="true">&harr;</span> feedback{" "}
          <span aria-hidden="true">&harr;</span> better contributions
        </p>
        <p className="muted">
          Rooms and chat stay within your exact NFT rank. A higher rank does not
          unlock lower-rank rooms.
        </p>
      </section>
      <section className="section" aria-labelledby="nft-utility-title">
        <div className="section-heading">
          <h2 id="nft-utility-title">One membership. Five ranks.</h2>
          <Link className="inline-link" href="/xp">
            XP and rank rules
          </Link>
        </div>
        <RankBadges current={rank} />
        <div className="membership-utility">
          <div>
            <h3>
              <BadgeCheck size={19} aria-hidden="true" /> Available in the pilot
            </h3>
            <p>
              Your NFT verifies membership and determines your rank&apos;s
              rooms. Share research, collaborate, follow updates and keep a
              reviewed contribution history.
            </p>
            <p>
              New memberships start at Bronze. XP and reputation belong to you,
              not to a buyer of your NFT.
            </p>
          </div>
          <div>
            <h3>
              <Coins size={19} aria-hidden="true" /> Planned, not active
            </h3>
            <p>
              NFT upgrades, XP conversion into $GRIND, delegation, earning
              features and premium specialist groups.
            </p>
            <p>
              Membership does not guarantee rewards, opportunity eligibility or
              reviewer authority.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HomeActions({
  member,
  signedIn,
}: {
  member: boolean;
  signedIn: boolean;
}) {
  return (
    <div className="home-actions">
      <Link className="button" href={member ? "/workbench" : "/join"}>
        <Users size={17} aria-hidden="true" />
        {member
          ? "Open your Hub"
          : signedIn
            ? "Continue membership setup"
            : "Get started"}
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
      {member ? (
        <>
          <Link className="inline-link" href="/findings/new">
            <FilePlus2 size={16} aria-hidden="true" /> Submit alpha
          </Link>
          <Link className="inline-link" href="/following">
            <Bell size={16} aria-hidden="true" /> Following and updates
          </Link>
          <Link className="inline-link" href="/membership">
            My contributions
          </Link>
        </>
      ) : (
        <Link className="inline-link" href="/join?mode=demo">
          Try the demo <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
