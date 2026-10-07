import { Screen, MembershipRequired } from "./screen";
import { readResearch } from "@/server/research/service";
import { ServiceError } from "@/server/errors";
import { getEnvironment } from "@/server/environment";
import { reportFailure } from "@/server/diagnostics";
import Link from "next/link";
import { RefreshResearch } from "./research-forms";
import { GrindIntelligence } from "./grind-intelligence";
import {
  Workbench,
  FindingEditor,
  FindingRecord,
  MembershipProgress,
  ReviewDesk,
} from "./research-views";
export async function ResearchScreen({
  view,
  id,
  message,
  revise,
  room,
  profile,
  sourceRevision,
  saved,
}: {
  view:
    "workbench" | "new" | "record" | "review" | "membership" | "intelligence";
  id?: string;
  message?: string;
  revise?: string;
  room?: string;
  profile?: string;
  sourceRevision?: string;
  saved?: string;
}) {
  const title = {
    workbench: "Hub",
    new: "Submit alpha",
    record: saved ? "Alpha saved" : "Alpha",
    review: "Review Desk",
    membership: "My profile",
    intelligence: "Grind Intelligence",
  }[view];
  let data;
  let denied = false;
  let unavailable = false;
  if (getEnvironment().GRINDLY_STAGE !== "membership") denied = true;
  else
    try {
      data = await readResearch(false, {
        room,
        profile,
        finding: id,
        version: revise,
        message,
        sourceRevision,
      });
    } catch (error) {
      reportFailure(`research.render.${view}`, error);
      unavailable =
        error instanceof ServiceError &&
        [
          "SPACE_UNAVAILABLE",
          "PROFILE_UNAVAILABLE",
          "RECORD_UNAVAILABLE",
        ].includes(error.code);
      denied =
        error instanceof ServiceError && [401, 403, 404].includes(error.status);
    }
  return (
    <Screen title={title}>
      {view === "intelligence" && !data && (
        <section className="intelligence-intro">
          <p>
            Follow the evidence behind an alpha: checked sources, unanswered
            questions, earlier contributions and later observations.
          </p>
          <p>
            <strong>AI analysis is not connected yet.</strong>{" "}
            Retrieved sources do not by themselves prove a claim.
          </p>
        </section>
      )}
      {view === "record" &&
        data?.profiles.find((p) => p.member_id === data.memberId)?.is_demo && (
          <p className="sample-label">
            Sample account: isolated contributions and XP.
          </p>
        )}
      {!data ? (
        unavailable ? (
          <p className="notice" role="alert">
            This space or record is not available to your membership.{" "}
            <Link href="/workbench">Return to your space</Link>
          </p>
        ) : denied ? (
          <MembershipRequired />
        ) : (
          <div className="notice" role="alert">
            Research or ownership check unavailable. Please reload to retry.
            <RefreshResearch />
          </div>
        )
      ) : view === "review" &&
        !data.roles.includes("reviewer") &&
        !data.roles.includes("steward") ? (
        <p className="notice">
          Review authority required.{" "}
          <Link href="/membership">
            View your evaluation results in My profile
          </Link>
          .
        </p>
      ) : view === "intelligence" ? (
        <GrindIntelligence data={data} id={id} />
      ) : view === "workbench" ? (
        <Workbench data={data} profileId={profile} />
      ) : view === "new" ? (
        <FindingEditor data={data} sourceMessage={message} revise={revise} />
      ) : view === "record" ? (
        <FindingRecord data={data} id={id ?? "latest"} saved={saved} />
      ) : view === "review" ? (
        <ReviewDesk data={data} />
      ) : (
        <MembershipProgress data={data} />
      )}
    </Screen>
  );
}
