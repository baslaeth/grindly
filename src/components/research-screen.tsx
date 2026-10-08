import { Screen, MembershipRequired } from "./screen";
import { readResearch } from "@/server/research/service";
import { ServiceError } from "@/server/errors";
import { getEnvironment } from "@/server/environment";
import { reportFailure } from "@/server/diagnostics";
import Link from "next/link";
import { RefreshResearch } from "./research-forms";
import { GrindIntelligence } from "./grind-intelligence";
import { Watchlist } from "./watchlist";
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
    | "workbench"
    | "new"
    | "record"
    | "review"
    | "membership"
    | "intelligence"
    | "following";
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
    following: "Following",
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
  const record =
    view === "record"
      ? data?.findings.find((f) => id === "latest" || f.id === id)
      : undefined;
  const recordTitle = data?.alphas?.find(
    (a) => a.version_id === record?.current_version,
  )?.subject;
  return (
    <Screen title={recordTitle && !saved ? recordTitle : title}>
      {view === "intelligence" && !data && (
        <section className="intelligence-intro">
          <p>
            Follow the evidence behind an alpha: checked sources, unanswered
            questions, earlier contributions and later observations.
          </p>
          <p>
            <strong>AI analysis is not connected yet.</strong> Retrieved sources
            do not by themselves prove a claim.
          </p>
        </section>
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
      ) : view === "following" ? (
        <Watchlist data={data} />
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
