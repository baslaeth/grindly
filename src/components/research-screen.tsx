import { Screen, MembershipRequired } from "./screen";
import { readResearch } from "@/server/research/service";
import { ServiceError } from "@/server/errors";
import { getEnvironment } from "@/server/environment";
import { reportFailure } from "@/server/diagnostics";
import Link from "next/link";
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
}: {
  view: "workbench" | "new" | "record" | "review" | "membership";
  id?: string;
  message?: string;
  revise?: string;
  room?: string;
  profile?: string;
  sourceRevision?: string;
}) {
  const title = {
    workbench: "Hub",
    new: "Submit alpha",
    record: "History",
    review: "Review Desk",
    membership: "My profile",
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
      {data?.profiles.find((p) => p.member_id === data.memberId)?.is_demo && (
        <p className="notice">
          Isolated sample account. Work, evaluations and XP here are test
          activity.
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
          <p className="notice" role="alert">
            Research or ownership check unavailable. Please reload to retry.
          </p>
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
      ) : view === "workbench" ? (
        <Workbench data={data} profileId={profile} />
      ) : view === "new" ? (
        <FindingEditor data={data} sourceMessage={message} revise={revise} />
      ) : view === "record" ? (
        <FindingRecord data={data} id={id ?? "latest"} />
      ) : view === "review" ? (
        <ReviewDesk data={data} />
      ) : (
        <MembershipProgress data={data} />
      )}
    </Screen>
  );
}
