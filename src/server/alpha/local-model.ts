import "server-only";
import { ServiceError } from "../errors";

// A local model must be explicitly configured; never fall through to a paid/cloud model.
export function localModelConfiguration(isDemo: boolean) {
  const scope = process.env.LOCAL_AI_APPROVAL;
  const model = process.env.OLLAMA_MODEL;
  if (
    (scope !== "all" && !(scope === "demo" && isDemo)) ||
    !model ||
    !/^[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+$/.test(model) ||
    model.endsWith("-cloud")
  )
    throw new ServiceError(
      "LOCAL_AI_UNAVAILABLE",
      "AI analysis is not connected yet.",
      503,
    );
  return { model };
}
