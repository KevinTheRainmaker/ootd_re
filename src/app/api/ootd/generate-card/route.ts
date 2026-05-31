import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { checkCardLimit, incrementCardCount } from "@/lib/usage";
import { getSignedUrl } from "@/lib/storage";
import { generateCard } from "@/lib/ai/card-gen";
import type {
  GenerateCardRequest,
  GenerateCardResponse,
  ApiError,
  CardType,
} from "@/types/api";

/** basic은 무제한 무료. 나머지는 무료 월 5회 / Pro 월 30회 */
const USAGE_COUNTED_TYPES: CardType[] = ["ai", "remove-bg", "style"];

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GenerateCardResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let body: GenerateCardRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const cardType: CardType = body.card_type ?? "basic";

  if (!body.ootd_data?.original_image_url) {
    return NextResponse.json(
      { error: "ootd_data.original_image_url이 필요합니다." },
      { status: 400 },
    );
  }

  // basic은 이미지 처리 없이 원본 URL 그대로 (usage 차감 없음, 무제한)
  if (cardType === "basic") {
    return NextResponse.json(
      {
        card_image_url: body.ootd_data.original_image_url,
        plan_used: "B" as const,
      },
      { status: 200 },
    );
  }

  // AI / 배경제거 / 스타일: usage 체크 (무료 5회/월, Pro 30회/월)
  if (USAGE_COUNTED_TYPES.includes(cardType)) {
    const limitInfo = await checkCardLimit(userId);
    if (!limitInfo.allowed) {
      return NextResponse.json(
        {
          error: "monthly_limit_exceeded",
          code: "monthly_limit_exceeded",
          details: {
            current: limitInfo.current,
            limit: limitInfo.limit,
            plan: limitInfo.plan,
          },
        },
        { status: 403 },
      );
    }
  }

  try {
    const signedImageUrl = await getSignedUrl(
      body.ootd_data.original_image_url,
    );
    const ootdData = { ...body.ootd_data, original_image_url: signedImageUrl };
    const result = await generateCard(ootdData, userId);

    if (USAGE_COUNTED_TYPES.includes(cardType)) {
      await incrementCardCount(userId);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "카드 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
