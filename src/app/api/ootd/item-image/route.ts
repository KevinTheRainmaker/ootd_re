import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  generateGarmentCutout,
  parseItemImageRequest,
  readImageResponse,
} from "@/lib/ai/item-extraction";
import {
  getSignedItemImageUrl,
  uploadItemCutout,
} from "@/lib/storage";
import {
  assertOwnedItemImagePath,
} from "@/lib/ootd-classification";
import {
  claimItemExtraction,
  completeItemExtraction,
  failItemExtraction,
} from "@/lib/db/item-extraction";
import type { ApiError } from "@/types/api";
import { createHash } from "node:crypto";

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

  let claimToken: string | null = null;
  try {
    const claim = await claimItemExtraction(
      session.user.id,
      body.extraction_id,
      body.crop_image_path,
    );
    if (claim.disposition === "completed" && claim.image_path) {
      return NextResponse.json(
        {
          image_url: await getSignedItemImageUrl(claim.image_path),
          image_path: claim.image_path,
        },
        { status: 200 },
      );
    }
    if (claim.disposition === "busy" || !claim.claim_token) {
      return NextResponse.json(
        {
          error: "같은 아이템 이미지를 이미 생성하고 있습니다.",
          code: "item_image_processing",
        },
        { status: 409 },
      );
    }
    claimToken = claim.claim_token;

    const signedUrl = await getSignedItemImageUrl(body.crop_image_path, 5 * 60);
    const cropResponse = await fetch(signedUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    const crop = await readImageResponse(cropResponse);

    const cutout = await generateGarmentCutout(
      crop,
      claim.category,
      claim.color_hex,
    );
    const { url, path } = await uploadItemCutout(
      cutout,
      session.user.id,
      body.extraction_id,
      claimToken,
    );
    await completeItemExtraction(
      session.user.id,
      body.extraction_id,
      claimToken,
      path,
      createHash("sha256").update(cutout).digest("hex"),
    );
    return NextResponse.json({ image_url: url, image_path: path }, { status: 201 });
  } catch (error) {
    console.error("[item-image] 의류 분리 실패", error);
    const message = error instanceof Error ? error.message : "unknown";
    if (claimToken) {
      await failItemExtraction(
        session.user.id,
        body.extraction_id,
        claimToken,
        "generation_failed",
        message,
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
