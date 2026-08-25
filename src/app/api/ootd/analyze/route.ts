import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getAuthSession } from "@/lib/auth";
import { getItemImagePath, getSignedUrl, uploadItemCrop } from "@/lib/storage";
import { analyzeOotdImage } from "@/lib/ai/vision";
import {
  cropDetectedItem,
  normalizeSourceImage,
  readImageResponse,
} from "@/lib/ai/item-extraction";
import {
  OotdValidationError,
  assertOwnedStorageImageUrl,
} from "@/lib/ootd-classification";
import type { AnalyzeRequest, AnalyzeResponse, ApiError } from "@/types/api";
import { enqueueItemExtraction } from "@/lib/db/item-extraction";
import {
  claimOotdAnalysis,
  releaseOotdAnalysis,
} from "@/lib/db/analysis";

export const maxDuration = 120;
const MAX_REQUEST_BYTES = 8 * 1024;

async function readRequestJson(req: NextRequest): Promise<unknown> {
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    throw new Error("request_too_large");
  }
  if (!req.body) throw new Error("invalid_request");
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new Error("request_too_large");
    }
    chunks.push(value);
  }
  return JSON.parse(
    Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8"),
  );
}

function extractionIdFor(userId: string, crop: Buffer): string {
  const bytes = createHash("sha256").update(userId).update(crop).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<AnalyzeResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AnalyzeRequest;
  try {
    const parsed = await readRequestJson(req);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("image_url" in parsed) ||
      typeof parsed.image_url !== "string"
    ) {
      throw new Error("invalid_request");
    }
    body = { image_url: parsed.image_url };
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error && error.message === "request_too_large"
        ? "요청 본문이 너무 큽니다."
        : "잘못된 요청 형식입니다." },
      { status: error instanceof Error && error.message === "request_too_large" ? 413 : 400 },
    );
  }

  if (!body.image_url) {
    return NextResponse.json(
      { error: "image_url이 필요합니다." },
      { status: 400 },
    );
  }

  let analysisClaimToken: string | null = null;
  try {
    const claim = await claimOotdAnalysis(session.user.id);
    if (claim.disposition === "busy" || !claim.claim_token) {
      return NextResponse.json(
        { error: "이미 다른 착장 분석을 진행하고 있습니다.", code: "analysis_busy" },
        { status: 409 },
      );
    }
    analysisClaimToken = claim.claim_token;
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!storageUrl) throw new Error("storage_not_configured");
    assertOwnedStorageImageUrl(
      body.image_url,
      session.user.id,
      ["originals"],
      storageUrl,
    );
    const signedUrl = await getSignedUrl(body.image_url);
    const sourceResponse = await fetch(signedUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    const normalizedImage = await normalizeSourceImage(
      await readImageResponse(sourceResponse),
    );
    const analysisUrl = `data:image/png;base64,${normalizedImage.toString("base64")}`;
    const result = await analyzeOotdImage(analysisUrl);
    const items = await Promise.all(
      result.items.map(async (item) => {
        if (!item.bounding_box) {
          throw new Error("아이템 위치를 확인할 수 없습니다.");
        }
        const crop = await cropDetectedItem(normalizedImage, item.bounding_box);
        const extractionId = extractionIdFor(session.user.id, crop);
        const path = getItemImagePath(session.user.id, extractionId, "crop");
        const fingerprint = createHash("sha256").update(crop).digest("hex");
        await enqueueItemExtraction(
          session.user.id,
          extractionId,
          path,
          fingerprint,
          item.bounding_box,
          item.category,
          item.color_hex,
        );
        const { url } = await uploadItemCrop(
          crop,
          session.user.id,
          extractionId,
        );
        return {
          ...item,
          image_url: null,
          image_path: null,
          crop_image_url: url,
          crop_image_path: path,
          extraction_id: extractionId,
          extraction_job_id: extractionId,
        };
      }),
    );
    return NextResponse.json({ ...result, items }, { status: 200 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "not_fashion") {
      return NextResponse.json(
        {
          error: "패션 사진에서 사람을 인식할 수 없습니다.",
          code: "not_fashion",
        },
        { status: 400 },
      );
    }
    if (err instanceof OotdValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (e.message?.includes("analysis_quota_exceeded")) {
      return NextResponse.json(
        { error: "이번 달 착장 분석 한도를 모두 사용했습니다.", code: "analysis_quota_exceeded" },
        { status: 429 },
      );
    }
    console.error("[analyze] 착장 분석 실패", err);
    return NextResponse.json(
      { error: "AI 분석 중 오류가 발생했습니다.", code: "analysis_failed" },
      { status: 500 },
    );
  } finally {
    if (analysisClaimToken) {
      await releaseOotdAnalysis(session.user.id, analysisClaimToken);
    }
  }
}
