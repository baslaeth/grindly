import "server-only";
import { getCurrentMember } from "./auth/session";
import { getEnvironment } from "./environment";
import { reportFailure } from "./diagnostics";
export async function navigationContext() {
  if (getEnvironment().GRINDLY_STAGE === "foundation")
    return { signedIn: false, reviewer: false };
  try {
    const member = await getCurrentMember();
    if (!member) return { signedIn: false, reviewer: false };
    // Review Desk now serves contributors too; authority is checked inside the
    // protected snapshot and mutation handlers, not by sidebar visibility.
    return { signedIn: true, reviewer: false };
  } catch (error) {
    reportFailure("navigation.session", error);
    return { signedIn: false, reviewer: false };
  }
}
