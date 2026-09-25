"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Search,
  ScanLine,
  ListChecks,
  FileText,
  ShieldCheck,
  Fingerprint,
  MessagesSquare,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
const scenes = [
  {
    title: "You do not need every specialty.",
    detail:
      "One question touches project context, on-chain risk and opportunity operations.",
    icon: Search,
    outcome: "A shared question",
  },
  {
    title: "Contribute your useful piece.",
    detail:
      "Project context. An observation boundary. A practical checklist. Each keeps its author and sources.",
    icon: FileText,
    outcome: "Attributed contributions",
  },
  {
    title: "Connect the evidence.",
    detail:
      "Different perspectives form a shared picture. Repeated sources are not independent confirmation.",
    icon: FileText,
    outcome: "Connected evidence",
  },
  {
    title: "Independent review makes the difference.",
    detail:
      "An authorized peer records supported claims and limitations. Only accepted findings enter the brief.",
    icon: ShieldCheck,
    outcome: "Reviewed evidence brief",
  },
  {
    title: "Build a history that stays yours.",
    detail:
      "Useful reviewed work earns attributable credit. Eligibility is not automatic promotion or payment.",
    icon: Fingerprint,
    outcome: "Personal contribution history",
  },
  {
    title: "Return with a better next question.",
    detail:
      "Human-approved Silver opens peer-request initiation. Ask for the expertise that complements your own.",
    icon: MessagesSquare,
    outcome: "A new peer request",
  },
];
const subscribe = (listener: () => void) => {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
export default function CoreLoopMotion() {
  const reduced = useSyncExternalStore(
    subscribe,
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const active = playing && !reduced && !finished;
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => {
      if (frame === 5) {
        setFinished(true);
        setPlaying(false);
      } else setFrame(frame + 1);
    }, 3000);
    return () => clearTimeout(timer);
  }, [active, frame]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  const scene = scenes[frame]!;
  const Icon = scene.icon;
  return (
    <div className="loop-player" data-playing={active} data-reduced={reduced}>
      <div className="loop-stage" data-frame={frame}>
        <div className="loop-brand">
          <Image
            src="/brand/grindly/grindly-logo.svg"
            width={28}
            height={28}
            alt=""
          />
          <strong>Grindly</strong>
          <span>Illustrative core loop</span>
        </div>
        <div className="loop-diagram" aria-hidden="true">
          <div className="loop-people">
            <span>
              <Search />
              Project Analyst
            </span>
            <span>
              <ScanLine />
              On-chain / Risk Analyst
            </span>
            <span>
              <ListChecks />
              Airdrop Hunter / Opportunity Operations
            </span>
          </div>
          <div className="loop-connection" />
          <div className="loop-outcome" key={frame}>
            <Icon size={28} />
            <span>{scene.outcome}</span>
          </div>
        </div>
        <div className="loop-caption" aria-live={active ? "off" : "polite"}>
          <p className="eyebrow">{String(frame + 1).padStart(2, "0")} / 06</p>
          <h3>{scene.title}</h3>
          <p>{scene.detail}</p>
        </div>
        <div className="loop-progress" aria-hidden="true">
          {scenes.map((s, i) => (
            <span key={s.title} data-complete={i <= frame} />
          ))}
        </div>
      </div>
      <div className="loop-controls">
        {!reduced && !finished && (
          <button
            className="button secondary icon-button"
            type="button"
            aria-label={active ? "Pause explainer" : "Resume explainer"}
            title={active ? "Pause explainer" : "Resume explainer"}
            onClick={() => setPlaying(!playing)}
          >
            {active ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
        <button
          className="button secondary icon-button"
          type="button"
          aria-label="Replay explainer"
          title="Replay explainer"
          onClick={() => {
            setFrame(0);
            setFinished(false);
            setPlaying(true);
          }}
        >
          <RotateCcw size={18} />
        </button>
        <button
          className="button secondary icon-button"
          type="button"
          aria-label="Next explainer scene"
          title="Next explainer scene"
          disabled={frame === 5}
          onClick={() => {
            setPlaying(false);
            setFrame(frame + 1);
          }}
        >
          <ChevronRight size={18} />
        </button>
        <span className="muted">
          {reduced
            ? "Reduced motion: advance at your own pace"
            : finished
              ? "End of explainer"
              : active
                ? "Playing once, no sound"
                : "Paused"}
        </span>
      </div>
    </div>
  );
}
