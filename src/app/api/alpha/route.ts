import { after } from "next/server";
import {
  alphaAction,
  alphaMutation,
  preparePreliminary,
  executePreliminary,
} from "@/server/alpha/service";
import {
  assertSameOrigin,
  readJson,
  jsonResponse,
  errorResponse,
} from "@/server/http";
import { getEnvironment } from "@/server/environment";
import { reportFailure, withRequestDiagnostics } from "@/server/diagnostics";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      assertSameOrigin(request, getEnvironment().APP_URL);
      const input = await readJson(request, alphaAction, 30000);
      if (input.action === "preliminary" || input.action === "refreshSources") {
        const context = await preparePreliminary(input.version);
        await executePreliminary(context);
        return jsonResponse({
          run: context.run,
          message: context.existing
            ? "Showing the latest saved source check. A recent or running check is reused."
            : "Source check finished. Review retrieved evidence and any limitations below.",
        });
      }
      const result = await alphaMutation(input);
      if (input.action === "submit") {
        // A committed submission survives provider failure or interrupted background work.
        after(async () => {
          try {
            await executePreliminary(
              await preparePreliminary((result as { version: string }).version),
            );
          } catch {
            reportFailure(
              "alpha.enqueue",
              new Error("Review preparation unavailable"),
            );
          }
        });
      }
      return jsonResponse(result);
    } catch (e) {
      reportFailure("alpha.mutation", e);
      return errorResponse(e);
    }
  });
}
