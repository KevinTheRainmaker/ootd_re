import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAuthSession } from "@/lib/auth";
import { getSignedUrl } from "@/lib/storage";
import { generateCard } from "@/lib/ai/card-gen";
import {
  normalizeSourceImage,
  readImageResponse,
} from "@/lib/ai/item-extraction";
import type {
  GenerateCardResponse,
  ApiError,
  CardType,
} from "@/types/api";
import { InvalidCardTypeError, normalizeCardType } from "@/lib/card-type";
import {
  CardGenerationRequestError,
  createCardGenerationFingerprint,
  normalizeCardGenerationRequestId,
  parseCardGenerationRequest,
  readLimitedJsonBody,
} from "@/lib/card-generation";
import {
  completeCardGeneration,
  refundCardGeneration,
  reserveCardGeneration,
} from "@/lib/db/card-generation";
import {
  OotdValidationError,
  assertOwnedStorageImageUrl,
} from "@/lib/ootd-classification";

/** basic은 무제한 무료. AI 카드는 무료 월 5회 / Pro 월 30회 */
export const maxDuration = 180;

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GenerateCardResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body;
  try {
    body = parseCardGenerationRequest(await readLimitedJsonBody(req));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CardGenerationRequestError
            ? error.message
            : "잘못된 요청 형식입니다.",
        code: "invalid_card_request",
      },
      { status: 400 },
    );
  }

  let cardType: CardType;
  try {
    cardType = normalizeCardType(body.card_type);
  } catch (error) {
    if (error instanceof InvalidCardTypeError) {
      return NextResponse.json(
        { error: "지원하지 않는 카드 타입입니다.", code: "invalid_card_type" },
        { status: 400 },
      );
    }
    throw error;
  }

  const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!storageUrl) {
    return NextResponse.json(
      { error: "이미지 저장소 설정을 확인할 수 없습니다." },
      { status: 500 },
    );
  }
  try {
    assertOwnedStorageImageUrl(
      body.ootd_data.original_image_url,
      userId,
      ["originals"],
      storageUrl,
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof OotdValidationError
            ? error.message
            : "원본 이미지 경로가 올바르지 않습니다.",
        code: "invalid_original_image",
      },
      { status: 400 },
    );
  }

  // basic은 검증된 원본 URL 그대로 반환 (usage 차감 없음, 무제한)
  if (cardType === "basic") {
    return NextResponse.json(
      {
        card_image_url: body.ootd_data.original_image_url,
        plan_used: "B" as const,
      },
      { status: 200 },
    );
  }

  let requestId: string;
  try {
    requestId = normalizeCardGenerationRequestId(body.request_id, randomUUID);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof CardGenerationRequestError
            ? error.message
            : "카드 생성 요청 ID가 올바르지 않습니다.",
        code: "invalid_card_request_id",
      },
      { status: 400 },
    );
  }

  const fingerprint = createCardGenerationFingerprint(body.ootd_data);
  let reservation;
  try {
    reservation = await reserveCardGeneration(userId, requestId, fingerprint);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("card_generation_quota_exceeded")) {
      return NextResponse.json(
        { error: "monthly_limit_exceeded", code: "monthly_limit_exceeded" },
        { status: 403 },
      );
    }
    if (message.includes("card_generation_idempotency_conflict")) {
      return NextResponse.json(
        {
          error: "같은 카드 생성 요청 ID가 다른 내용에 사용되었습니다.",
          code: "card_generation_idempotency_conflict",
        },
        { status: 409 },
      );
    }
    console.error("[generate-card] 사용량 예약 실패", error);
    return NextResponse.json(
      {
        error: "카드 생성 사용량을 확인할 수 없습니다. 같은 요청으로 다시 시도해주세요.",
        code: "card_generation_reservation_uncertain",
      },
      { status: 503 },
    );
  }

  if (
    reservation.disposition === "completed" &&
    reservation.card_image_url &&
    reservation.plan_used
  ) {
    return NextResponse.json(
      {
        card_image_url: reservation.card_image_url,
        plan_used: reservation.plan_used,
      },
      { status: 200 },
    );
  }
  if (reservation.disposition === "busy") {
    return NextResponse.json(
      {
        error: "같은 AI 카드를 이미 생성하고 있습니다.",
        code: "card_generation_busy",
      },
      { status: 409 },
    );
  }
  if (
    reservation.disposition === "refunded" ||
    reservation.disposition === "stalled" ||
    !reservation.worker_token
  ) {
    return NextResponse.json(
      {
        error: "이 카드 생성 요청은 종료되었습니다. 다시 시도해주세요.",
        code: reservation.error_code ?? "card_generation_ended",
      },
      { status: 409 },
    );
  }

  let sourceImage: Buffer;
  try {
    const signedImageUrl = await getSignedUrl(body.ootd_data.original_image_url);
    const sourceResponse = await fetch(signedImageUrl, {
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
    });
    sourceImage = await normalizeSourceImage(
      await readImageResponse(sourceResponse),
    );
  } catch (error) {
    let refunded = false;
    try {
      refunded = await refundCardGeneration(
        userId,
        requestId,
        reservation.worker_token,
        "invalid_original_image",
        error instanceof Error ? error.message : "unknown",
      );
    } catch (refundError) {
      console.error("[generate-card] 원본 이미지 실패 환불 오류", refundError);
    }
    console.error("[generate-card] 원본 이미지 검증 실패", error);
    return NextResponse.json(
      {
        error: refunded
          ? "원본 이미지를 안전하게 불러올 수 없습니다."
          : "원본 이미지 실패 상태를 확인하지 못했습니다. 같은 요청으로 다시 시도해주세요.",
        code: refunded
          ? "invalid_original_image"
          : "card_generation_refund_uncertain",
      },
      { status: refunded ? 422 : 503 },
    );
  }

  let result: GenerateCardResponse;
  try {
    result = await generateCard(body.ootd_data, userId, sourceImage);
  } catch (error) {
    let refunded = false;
    try {
      refunded = await refundCardGeneration(
        userId,
        requestId,
        reservation.worker_token,
        "generation_failed",
        error instanceof Error ? error.message : "unknown",
      );
    } catch (refundError) {
      console.error("[generate-card] 사용량 환불 실패", refundError);
    }
    console.error("[generate-card] 카드 생성 실패", error);
    return NextResponse.json(
      {
        error: refunded
          ? "카드 생성 중 오류가 발생했습니다. 다시 시도해주세요."
          : "카드 생성 실패 상태를 확인하지 못했습니다. 같은 요청으로 다시 시도해주세요.",
        code: refunded
          ? "card_generation_failed"
          : "card_generation_refund_uncertain",
      },
      { status: refunded ? 500 : 503 },
    );
  }

  try {
    const completed = await completeCardGeneration(
      userId,
      requestId,
      reservation.worker_token,
      result,
    );
    if (!completed) {
      return NextResponse.json(
        {
          error: "카드 생성 요청 상태가 변경되었습니다. 다시 확인해주세요.",
          code: "card_generation_stale",
        },
        { status: 409 },
      );
    }
  } catch (error) {
    // 완료가 DB에 반영됐으나 응답만 유실됐을 수 있으므로 여기서는 환불하지 않는다.
    console.error("[generate-card] 카드 생성 완료 기록 실패", error);
    return NextResponse.json(
      {
        error: "카드 생성 결과를 확인하지 못했습니다. 같은 요청으로 다시 시도해주세요.",
        code: "card_generation_finalize_failed",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(result, { status: 200 });
}
