import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_ORIGINALS = "originals";
const BUCKET_CARDS = "cards";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export function isAllowedMime(mime: string): mime is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

export function validateImageFile(
  mime: string,
  size: number,
): { ok: true } | { ok: false; reason: string } {
  if (!isAllowedMime(mime)) {
    return {
      ok: false,
      reason: "지원하지 않는 파일 형식입니다. (JPG/PNG/WebP만 허용)",
    };
  }
  if (size > MAX_SIZE_BYTES) {
    return { ok: false, reason: "파일 크기가 10MB를 초과합니다." };
  }
  return { ok: true };
}

export async function uploadOriginalImage(
  buffer: Buffer,
  mime: AllowedMime,
  userId: string,
): Promise<{ url: string; path: string }> {
  const ext =
    mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_ORIGINALS)
    .upload(path, buffer, { contentType: mime, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage
    .from(BUCKET_ORIGINALS)
    .getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function uploadCardImage(
  buffer: Buffer,
  userId: string,
): Promise<{ url: string; path: string }> {
  const path = `${userId}/${Date.now()}.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET_CARDS)
    .upload(path, buffer, { contentType: "image/png", upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabaseAdmin.storage.from(BUCKET_CARDS).getPublicUrl(path);
  return { url: data.publicUrl, path };
}
