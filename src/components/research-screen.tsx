import { Screen, MembershipRequired } from "./screen";
import { readResearch } from "@/server/research/service";
import { ServiceError } from "@/server/errors";
import { getEnvironment } from "@/server/environment";
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
}: {
  view: "workbench" | "new" | "record" | "review" | "membership";
  id?: string;
  message?: string;
  revise?: string;
}) {
  const title = {
    workbench: "Research Workbench",
    new: "Submit Finding",
    record: "Contribution Record",
    review: "Review Desk",
    membership: "My Membership",
  }[view];
  let data;
  let denied = false;
  if (getEnvironment().GRINDLY_STAGE !== "membership") denied = true;
  else
    try {
      data = await readResearch();
    } catch (error) {
      denied =
        error instanceof ServiceError && [401, 403, 404].includes(error.status);
    }
  return (
    <Screen title={title}>
      {data?.profiles.find((p) => p.member_id === data.memberId)?.is_demo && (
        <p className="notice">
          Illustrative QA account. Its work, reviews and credit are test
          activity, not customer validation.
        </p>
      )}
      {!data ? (
        denied ? (
          <MembershipRequired />
        ) : (
          <p className="notice" role="alert">
            Research or ownership check unavailable. Please reload to retry.
          </p>
        )
      ) : view === "workbench" ? (
        <Workbench data={data} />
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
