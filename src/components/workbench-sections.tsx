"use client";
import { useEffect, useState, type ReactNode } from "react";
import {
  BookOpen,
  MessageSquare,
  Users,
  History,
  ArrowUpRight,
} from "lucide-react";

const sections = [
  { id: "discussion", label: "Chat", icon: MessageSquare },
  { id: "evidence", label: "Evidence brief", icon: BookOpen },
  { id: "opportunities", label: "Peer requests", icon: ArrowUpRight },
  { id: "record", label: "Contribution record", icon: History },
  { id: "participants", label: "Members", icon: Users },
] as const;
type Section = (typeof sections)[number]["id"];

export function WorkbenchSections(props: Record<Section, ReactNode>) {
  const [active, setActive] = useState<Section>("discussion");
  const [targetHash, setTargetHash] = useState("");
  useEffect(() => {
    const follow = (hash: string) => {
      if (hash === "#evidence-brief") setActive("evidence");
      if (hash === "#space-members") setActive("participants");
      if (hash.startsWith("#message-") || hash === "#discussion")
        setActive("discussion");
      setTargetHash(hash);
    };
    const followHash = () => follow(window.location.hash);
    const followClick = (event: MouseEvent) => {
      const href =
        event.target instanceof Element
          ? event.target.closest("a")?.getAttribute("href")
          : null;
      const hash = href ? new URL(href, window.location.href).hash : "";
      if (
        hash === "#evidence-brief" ||
        hash === "#space-members" ||
        hash === "#discussion" ||
        hash.startsWith("#message-")
      )
        follow(hash);
    };
    followHash();
    window.addEventListener("hashchange", followHash);
    document.addEventListener("click", followClick);
    return () => {
      window.removeEventListener("hashchange", followHash);
      document.removeEventListener("click", followClick);
    };
  }, []);
  useEffect(() => {
    if (!targetHash) return;
    const target = document.getElementById(targetHash.slice(1));
    if (target && !target.closest("[hidden]")) {
      let parent = target.parentElement;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      target.scrollIntoView({ block: "start" });
    }
  }, [active, targetHash]);
  return (
    <div className="workbench-sections">
      <div
        className="workspace-tabs"
        role="tablist"
        aria-label="Research question views"
      >
        {sections.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            type="button"
            aria-selected={active === id}
            aria-controls={`panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            onClick={() => setActive(id)}
            onKeyDown={(event) => {
              let next = index;
              if (event.key === "ArrowRight")
                next = (index + 1) % sections.length;
              else if (event.key === "ArrowLeft")
                next = (index + sections.length - 1) % sections.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = sections.length - 1;
              else return;
              event.preventDefault();
              setActive(sections[next]!.id);
              document.getElementById(`tab-${sections[next]!.id}`)?.focus();
            }}
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      {sections.map(({ id }) => (
        <div
          key={id}
          role="tabpanel"
          id={`panel-${id}`}
          aria-labelledby={`tab-${id}`}
          hidden={active !== id}
          tabIndex={0}
        >
          {props[id]}
        </div>
      ))}
    </div>
  );
}

export function DiscussionHistory({ children }: { children: ReactNode[] }) {
  const older = children.slice(0, -4);
  const recent = children.slice(-4);
  return (
    <>
      {older.length > 0 && (
        <details className="history-disclosure">
          <summary>
            Earlier discussion{" "}
            <span className="muted">{older.length} messages</span>
          </summary>
          {older}
        </details>
      )}
      {recent}
    </>
  );
}
