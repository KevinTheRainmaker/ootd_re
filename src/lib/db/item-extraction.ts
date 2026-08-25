import { supabaseAdmin } from "@/lib/supabase";
import type { BoundingBox, ItemCategory } from "@/types";

export interface ItemExtractionClaim {
  disposition: "claimed" | "busy" | "completed" | "failed";
  image_path: string | null;
  claim_token: string | null;
  category: ItemCategory;
  color_hex: string | null;
  source_image_url: string | null;
  error_code: string | null;
}

export async function enqueueItemExtraction(
  userId: string,
  extractionId: string,
  cropImagePath: string,
  requestFingerprint: string,
  boundingBox: BoundingBox,
  category: ItemCategory,
  colorHex: string | null,
  sourceImageUrl: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("item_extraction_jobs").insert({
    user_id: userId,
    extraction_id: extractionId,
    crop_image_path: cropImagePath,
    request_fingerprint: requestFingerprint,
    crop_sha256: requestFingerprint,
    bounding_box: boundingBox,
    category,
    color_hex: colorHex,
    source_image_url: sourceImageUrl,
    status: "queued",
    attempts: 0,
  });
  if (!error) return;
  if (error.code !== "23505") throw new Error(error.message);
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("item_extraction_jobs")
    .select("request_fingerprint")
    .eq("user_id", userId)
    .eq("extraction_id", extractionId)
    .single();
  if (selectError || existing?.request_fingerprint !== requestFingerprint) {
    throw new Error("extraction_conflict");
  }
}

export async function claimItemExtraction(
  userId: string,
  extractionId: string,
  cropImagePath: string,
): Promise<ItemExtractionClaim> {
  const { data, error } = await supabaseAdmin
    .rpc("claim_item_extraction", {
      p_user_id: userId,
      p_extraction_id: extractionId,
      p_crop_image_path: cropImagePath,
    })
    .single();
  if (error) throw new Error(error.message);
  return data as ItemExtractionClaim;
}

export async function completeItemExtraction(
  userId: string,
  extractionId: string,
  claimToken: string,
  imagePath: string,
  imageSha256: string,
): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc("complete_item_extraction", {
    p_user_id: userId,
    p_extraction_id: extractionId,
    p_claim_token: claimToken,
    p_image_path: imagePath,
    p_image_sha256: imageSha256,
  });
  if (error) throw new Error(error.message);
  if (data !== true) throw new Error("stale_extraction_claim");
}

export async function failItemExtraction(
  userId: string,
  extractionId: string,
  claimToken: string,
  errorCode: string,
  reason: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("fail_item_extraction", {
    p_user_id: userId,
    p_extraction_id: extractionId,
    p_claim_token: claimToken,
    p_error_code: errorCode.slice(0, 64),
    p_error_message: reason.slice(0, 500),
  });
  if (error) console.error("[item-image] 실패 상태 저장 실패", error);
}

export async function listLegacyQualityMismatchJobs(
  limit = 100,
): Promise<Array<Record<string, unknown>>> {
  const { data, error } = await supabaseAdmin
    .from("item_extraction_jobs")
    .select(
      "user_id, extraction_id, crop_image_path, status, attempts, error_code, ootd_items!inner(id)",
    )
    .eq("status", "failed")
    .eq("error_code", "quality_mismatch")
    .gt("attempts", 0)
    .lt("attempts", 3)
    .order("updated_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw new Error(error.message);
  return (data ?? []) as Array<Record<string, unknown>>;
}
