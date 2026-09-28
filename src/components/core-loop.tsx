"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useState } from "react";
import { Play, ArrowRight, Search, ScanLine, ListChecks } from "lucide-react";
const Motion = dynamic(() => import("./core-loop-motion"), {
  loading: () => <p role="status">Preparing the explainer...</p>,
  ssr: false,
});
export function CoreLoop() {
  const [loaded, setLoaded] = useState(false);
  return (
    <section
      className="section explainer"
      aria-label="Grindly core loop explainer"
    >
      <div className="section-heading">
        <div>
          <h2>Different edges. Shared understanding.</h2>
        </div>
      </div>
      {loaded ? (
        <Motion />
      ) : (
        <div className="loop-poster">
          <div className="poster-specialists" aria-hidden="true">
            <Search />
            <ScanLine />
            <ListChecks />
            <ArrowRight />
            <Image
              src="/brand/grindly/grindly-logo.svg"
              alt=""
              width={48}
              height={48}
            />
          </div>
          <p>Question. Evidence. Review. A reason to return.</p>
          <button
            type="button"
            className="button light-action"
            onClick={() => setLoaded(true)}
          >
            <Play size={16} />
            Play the core loop
          </button>
        </div>
      )}
      <details className="explainer-transcript">
        <summary>Read the core loop</summary>
        <ol>
          <li>Different specialists face fragmented questions and evidence.</li>
          <li>
            Each contributes a useful piece, with sources and attribution.
          </li>
          <li>Their contributions connect into a shared research brief.</li>
          <li>
            Independent review records what is supported and what remains
            uncertain. Only accepted evidence enters the brief.
          </li>
          <li>
            Useful reviewed work builds a personal history and eligibility for
            human-assessed progression.
          </li>
          <li>
            A Silver member can initiate a peer request, bringing complementary
            expertise into the next question.
          </li>
        </ol>
      </details>
    </section>
  );
}
