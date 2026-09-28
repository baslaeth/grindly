import { z } from "zod";
import { chatInput, roomId } from "@/chat/model";
import { readChat, writeChat } from "@/server/chat/service";
import {
  assertSameOrigin,
  errorResponse,
  jsonResponse,
  readJson,
} from "@/server/http";
import { getEnvironment } from "@/server/environment";
import { reportFailure, withRequestDiagnostics } from "@/server/diagnostics";
const querySchema = z.object({
  room: roomId,
  before: z.coerce.number().int().positive().safe().optional(),
  after: z.coerce.number().int().positive().safe().optional(),
});
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      const q = querySchema.parse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      return jsonResponse(await readChat(q.room, q.before, q.after));
    } catch (e) {
      reportFailure("chat.read", e);
      return errorResponse(e);
    }
  });
}
export async function POST(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      assertSameOrigin(request, getEnvironment().APP_URL);
      return jsonResponse(
        await writeChat(await readJson(request, chatInput, 16384)),
      );
    } catch (e) {
      reportFailure("chat.write", e);
      return errorResponse(e);
    }
  });
}
