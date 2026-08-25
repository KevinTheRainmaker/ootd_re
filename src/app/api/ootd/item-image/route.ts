import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { parseItemImageRequest } from "@/lib/ai/item-extraction";
import { getSignedItemImageUrl } from "@/lib/storage";
import {
  assertOwnedItemImagePath,
} from "@/lib/ootd-classification";
import {
  ItemExtractionBusyError,
  processItemExtraction,
} from "@/lib/ai/item-extraction-worker";
import type { ApiError } from "@/types/api";

export const maxDuration = 300;

interface ItemImageResponse {
  image_url: string;
  image_path: string;
}

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
  return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8"));
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ItemImageResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ReturnType<typeof parseItemImageRequest>;
  try {
    body = parseItemImageRequest(await readRequestJson(req));
    assertOwnedItemImagePath(
      body.crop_image_path,
      session.user.id,
      body.extraction_id,
      "crop",
    );
  } catch (error) {
    if (error instanceof Error && error.message === "request_too_large") {
      return NextResponse.json(
        { error: "요청 본문이 너무 큽니다." },
        { status: 413 },
      );
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "잘못된 아이템 이미지 요청입니다.",
      },
      { status: 400 },
    );
  }

  try {
    const outcome = await processItemExtraction(
      session.user.id,
      body.extraction_id,
      body.crop_image_path,
    );
    if (outcome.status === "failed") {
      return NextResponse.json(
        {
          error: "원본과 일치하는 아이템 이미지를 만들지 못해 crop을 유지합니다.",
          code: outcome.errorCode,
        },
        { status: 422 },
      );
    }
    return NextResponse.json(
      {
        image_url: await getSignedItemImageUrl(outcome.imagePath),
        image_path: outcome.imagePath,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[item-image] 의류 분리 실패", error);
    const message = error instanceof Error ? error.message : "unknown";
    if (error instanceof ItemExtractionBusyError) {
      return NextResponse.json(
        { error: "같은 아이템 이미지를 이미 생성하고 있습니다.", code: "item_image_processing" },
        { status: 409 },
      );
    }
    if (
      message.includes("item_image_limit_exceeded") ||
      message.includes("item_generation_quota_exceeded")
    ) {
      return NextResponse.json(
        { error: "이번 달 아이템 이미지 생성 한도를 모두 사용했습니다.", code: "item_image_limit_exceeded" },
        { status: 429 },
      );
    }
    if (message.includes("extraction_conflict")) {
      return NextResponse.json(
        { error: "아이템 이미지 요청이 기존 요청과 일치하지 않습니다.", code: "extraction_conflict" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "개별 의류 이미지 생성에 실패했습니다. 다시 시도해주세요.",
        code: "item_image_failed",
      },
      { status: 502 },
    );
  }
}
