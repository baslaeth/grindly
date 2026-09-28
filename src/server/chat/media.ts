import "server-only";
import sharp from "sharp";
import { ServiceError } from "../errors";
export const maximumImageBytes = 2 * 1024 * 1024;
const formats: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
export async function validateImage(buffer: Buffer, declared: string) {
  if (!buffer.length || buffer.length > maximumImageBytes)
    throw new ServiceError(
      "INVALID_IMAGE",
      "Images must be at most 2 MB.",
      413,
    );
  try {
    const options = {
      animated: true,
      limitInputPixels: 16000000,
      failOn: "warning" as const,
    };
    const meta = await sharp(buffer, options).metadata();
    const type = formats[meta.format ?? ""];
    if (
      !type ||
      type !== declared ||
      !meta.width ||
      !meta.height ||
      (meta.pages ?? 1) > 100 ||
      meta.width * meta.height > 16000000
    )
      throw new Error("Invalid image");
    // Decode and re-encode; this rejects malformed content and strips metadata,
    // embedded non-image payloads and user-supplied filenames. Animation survives.
    const clean = await sharp(buffer, options)
      .toFormat(meta.format as "png" | "jpeg" | "webp" | "gif")
      .toBuffer();
    if (clean.length > maximumImageBytes)
      throw new Error("Encoded image too large");
    return { type, buffer: clean };
  } catch {
    throw new ServiceError(
      "INVALID_IMAGE",
      "Choose a valid PNG, JPEG, WebP or GIF under 2 MB and 100 frames.",
      400,
    );
  }
}
export async function readImageBody(request: Request) {
  if (!request.body)
    throw new ServiceError("INVALID_IMAGE", "Choose an image.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > maximumImageBytes) {
        await reader.cancel();
        throw new ServiceError(
          "INVALID_IMAGE",
          "Images must be at most 2 MB.",
          413,
        );
      }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks);
  } finally {
    reader.releaseLock();
  }
}
