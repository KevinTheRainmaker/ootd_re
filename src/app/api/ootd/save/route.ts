import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import { getAuthSession } from "@/lib/auth";
import { createOotdWithItems } from "@/lib/db/ootd";
import {
  OotdValidationError,
  assertOwnedItemImagePair,
  assertOwnedStorageImageUrl,
  parseSaveOotdRequest,
} from "@/lib/ootd-classification";
import type { SaveOotdRequest, SaveOotdResponse, ApiError } from "@/types/api";

const MAX_REQUEST_BYTES = 64 * 1024;

class RequestTooLargeError extends Error {}

async function readLimitedBody(req: NextRequest): Promise<string> {
  const contentLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    throw new RequestTooLargeError();
  }

  if (!req.body) return "";
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<SaveOotdResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SaveOotdRequest;
  try {
    const rawBody = await readLimitedBody(req);
    body = parseSaveOotdRequest(JSON.parse(rawBody));

    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!storageUrl) throw new Error("storage_not_configured");
    assertOwnedStorageImageUrl(
      body.original_image_url,
      session.user.id,
      ["originals"],
      storageUrl,
    );
    assertOwnedStorageImageUrl(
      body.card_image_url,
      session.user.id,
      ["originals", "cards"],
      storageUrl,
    );
    for (const item of body.items) {
      assertOwnedItemImagePair(
        item.extraction_job_id,
        item.image_path,
        item.crop_image_path,
        session.user.id,
      );
    }
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return NextResponse.json(
        { error: "요청 본문이 너무 큽니다." },
        { status: 413 },
      );
    }
    if (error instanceof Error && error.message === "storage_not_configured") {
      return NextResponse.json(
        { error: "저장소 설정을 확인할 수 없습니다." },
        { status: 500 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof OotdValidationError
            ? error.message
            : "잘못된 요청 형식입니다.",
      },
      { status: 400 },
    );
  }

  try {
    const shareId = body.is_public ? nanoid(8) : null;
    const requestFingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          original_image_url: body.original_image_url,
          card_image_url: body.card_image_url,
          items: body.items,
          style_summary: body.style_summary,
          hashtags: body.hashtags,
          is_public: body.is_public,
          memo: body.memo ?? null,
          date: body.date,
          mood: body.mood,
          weatherSnapshot: body.weatherSnapshot,
        }),
      )
      .digest("hex");

    const record = await createOotdWithItems({
      user_id: session.user.id,
      client_request_id: body.client_request_id,
      request_fingerprint: requestFingerprint,
      date: body.date,
      original_image_url: body.original_image_url,
      card_image_url: body.card_image_url,
      style_summary: body.style_summary || null,
      hashtags: body.hashtags,
      is_public: body.is_public,
      share_id: shareId,
      memo: body.memo ?? null,
      plan_used: null,
      mood: body.mood ?? "happy",
      weather_snapshot: body.weatherSnapshot ?? null,
      items: body.items,
    });

    return NextResponse.json(
      { id: record.id, share_id: record.share_id },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; details?: string };
    console.error("[save] 저장 실패:", err);
    if (e.message?.includes("idempotency_conflict")) {
      return NextResponse.json(
        {
          error: "같은 저장 요청 ID가 다른 내용에 사용되었습니다.",
          code: "idempotency_conflict",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "저장 중 오류가 발생했습니다.",
        code: "save_failed",
      },
      { status: 500 },
    );
  }
}
