import { z } from "zod";
import { roomId } from "@/chat/model";
import { requireResearchMembership as requireActiveMembership } from "@/server/membership/research-access";
import { privateResult } from "@/server/chat/service";
import { readImageBody, validateImage } from "@/server/chat/media";
import { createDataClient } from "@/server/supabase";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/server/http";
import { getEnvironment } from "@/server/environment";
import { reportFailure, withRequestDiagnostics } from "@/server/diagnostics";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      assertSameOrigin(request, getEnvironment().APP_URL);
      const active = await requireActiveMembership(true);
      const room = roomId.parse(request.headers.get("x-room"));
      const id = z.uuid().parse(request.headers.get("x-upload-id"));
      const guard = await createDataClient().rpc("member_room_guard", {
        p_member: active.member.id,
        p_binding: active.binding.id,
        p_room: room,
      });
      if (guard.error) privateResult(guard);
      const image = await validateImage(
        await readImageBody(request),
        request.headers.get("content-type") ?? "",
      );
      return jsonResponse(
        privateResult(
          await createDataClient().rpc("chat_upload", {
            p_member: active.member.id,
            p_binding: active.binding.id,
            p_room: room,
            p_id: id,
            p_type: image.type,
            p_content: image.buffer.toString("base64"),
            p_size: image.buffer.length,
          }),
        ),
      );
    } catch (e) {
      reportFailure("chat.upload", e);
      return errorResponse(e);
    }
  });
}
export async function GET(request: Request) {
  return withRequestDiagnostics(async () => {
    try {
      const active = await requireActiveMembership(true);
      const query = new URL(request.url).searchParams;
      const id = z.uuid().parse(query.get("id"));
      const version = query.has("version")
        ? z.uuid().parse(query.get("version"))
        : null;
      const alpha = query.has("alpha")
        ? z.uuid().parse(query.get("alpha"))
        : null;
      const db = createDataClient();
      const media = privateResult(
        alpha
          ? await db.rpc("alpha_media_read", {
              p_member: active.member.id,
              p_binding: active.binding.id,
              p_id: id,
              p_version: alpha,
            })
          : version
            ? await db.rpc("chat_source_media_read", {
                p_member: active.member.id,
                p_binding: active.binding.id,
                p_id: id,
                p_version: version,
              })
            : await db.rpc("chat_media_read", {
                p_member: active.member.id,
                p_binding: active.binding.id,
                p_id: id,
              }),
      ) as { type: string; content: string };
      return new Response(Buffer.from(media.content, "base64"), {
        headers: {
          "Content-Type": media.type,
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": "inline; filename=attachment",
          "Cross-Origin-Resource-Policy": "same-origin",
          "Content-Security-Policy": "default-src 'none'; sandbox",
        },
      });
    } catch (e) {
      reportFailure("chat.media", e);
      return errorResponse(e);
    }
  });
}
