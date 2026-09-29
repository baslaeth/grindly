import "server-only";
import { getCurrentMember } from "./auth/session";
import { getEnvironment } from "./environment";
import { createDataClient } from "./supabase";
import { reportFailure } from "./diagnostics";
export async function navigationContext() {
  if (getEnvironment().GRINDLY_STAGE === "foundation")
    return { signedIn: false, reviewer: false };
  try {
    const member = await getCurrentMember();
    if (!member) return { signedIn: false, reviewer: false };
    const db = createDataClient();
    const roles = await db
      .from("member_roles")
      .select("role")
      .eq("member_id", member.id)
      .eq("role", "reviewer");
    const scope = await db
      .from("research_reviewer_scopes")
      .select("member_id")
      .eq("member_id", member.id)
      .limit(1);
    const categoryScope = await db
      .from("alpha_reviewer_scopes")
      .select("member_id")
      .eq("member_id", member.id)
      .limit(1);
    return {
      signedIn: true,
      reviewer:
        !roles.error &&
        !scope.error &&
        !!roles.data?.length &&
        (!!scope.data?.length ||
          (!categoryScope.error && !!categoryScope.data?.length)),
    };
  } catch (error) {
    reportFailure("navigation.session", error);
    return { signedIn: false, reviewer: false };
  }
}
