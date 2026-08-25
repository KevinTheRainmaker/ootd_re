import { createHash } from "node:crypto";
import {
  generateGarmentCutout,
  normalizeSourceImage,
  readImageResponse,
  validateCropTarget,
  validateGarmentCutout,
} from "@/lib/ai/item-extraction";
import {
  claimItemExtraction,
  completeItemExtraction,
  failItemExtraction,
} from "@/lib/db/item-extraction";
import {
  getSignedItemImageUrl,
  getSignedUrl,
  uploadItemCutout,
} from "@/lib/storage";

export class ItemExtractionBusyError extends Error {
  constructor() {
    super("item_extraction_busy");
    this.name = "ItemExtractionBusyError";
  }
}

export type ItemExtractionOutcome =
  | { status: "completed"; imagePath: string }
  | { status: "failed"; errorCode: string };

async function fetchImage(url: string, timeoutMs = 15_000): Promise<Buffer> {
  return readImageResponse(
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
  );
}

export async function processItemExtraction(
  userId: string,
  extractionId: string,
  cropImagePath: string,
): Promise<ItemExtractionOutcome> {
  let claimToken: string | null = null;
  try {
    const claim = await claimItemExtraction(userId, extractionId, cropImagePath);
    if (claim.disposition === "completed" && claim.image_path) {
      return { status: "completed", imagePath: claim.image_path };
    }
    if (claim.disposition === "failed") {
      return { status: "failed", errorCode: claim.error_code ?? "generation_failed" };
    }
    if (claim.disposition === "busy" || !claim.claim_token) {
      throw new ItemExtractionBusyError();
    }
    if (!claim.source_image_url) {
      throw new Error("source_image_missing");
    }
    claimToken = claim.claim_token;

    const [crop, source] = await Promise.all([
      getSignedItemImageUrl(cropImagePath, 5 * 60).then((url) => fetchImage(url)),
      getSignedUrl(claim.source_image_url)
        .then((url) => fetchImage(url))
        .then(normalizeSourceImage),
    ]);

    const cropQuality = await validateCropTarget(
      crop,
      claim.category,
    );
    if (!cropQuality.accepted) {
      await failItemExtraction(
        userId,
        extractionId,
        claimToken,
        "crop_mismatch",
        cropQuality.reason,
      );
      return { status: "failed", errorCode: "crop_mismatch" };
    }

    const cutout = await generateGarmentCutout(
      crop,
      claim.category,
      claim.color_hex,
    );
    const quality = await validateGarmentCutout(
      source,
      cutout,
      claim.category,
    );
    if (!quality.accepted) {
      await failItemExtraction(
        userId,
        extractionId,
        claimToken,
        "quality_mismatch",
        quality.reason,
      );
      return { status: "failed", errorCode: "quality_mismatch" };
    }

    const { path } = await uploadItemCutout(
      cutout,
      userId,
      extractionId,
      claimToken,
    );
    await completeItemExtraction(
      userId,
      extractionId,
      claimToken,
      path,
      createHash("sha256").update(cutout).digest("hex"),
    );
    return { status: "completed", imagePath: path };
  } catch (error) {
    if (error instanceof ItemExtractionBusyError) throw error;
    if (claimToken) {
      await failItemExtraction(
        userId,
        extractionId,
        claimToken,
        "generation_failed",
        error instanceof Error ? error.message : "unknown",
      );
    }
    throw error;
  }
}
