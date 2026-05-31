import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { checkCardLimit, incrementCardCount } from "@/lib/usage";
import { getSignedUrl } from "@/lib/storage";
import { generateCard } from "@/lib/ai/card-gen";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  GenerateCardRequest,
  GenerateCardResponse,
  ApiError,
  CardType,
} from "@/types/api";

const PRO_ONLY_TYPES: CardType[] = ["ai", "style"];

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GenerateCardResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userPlan = session.user.plan ?? "free";

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

  // Pro 전용 기능 체크
  if (PRO_ONLY_TYPES.includes(cardType) && userPlan !== "pro") {
    return NextResponse.json(
      {
        error: "pro_required",
        code: "pro_required",
        details: { card_type: cardType },
      },
      { status: 403 },
    );
  }

  if (!body.ootd_data?.original_image_url) {
    return NextResponse.json(
      { error: "ootd_data.original_image_url이 필요합니다." },
      { status: 400 },
    );
  }

  // basic 카드는 이미지 처리 없이 원본 URL 그대로 사용 (usage 차감 없음)
  if (cardType === "basic") {
    return NextResponse.json(
      {
        card_image_url: body.ootd_data.original_image_url,
        plan_used: "B" as const,
      },
      { status: 200 },
    );
  }

  // AI / Pro 카드는 usage 체크 후 생성
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

  try {
    const signedImageUrl = await getSignedUrl(
      body.ootd_data.original_image_url,
    );
    const ootdData = { ...body.ootd_data, original_image_url: signedImageUrl };
    const result = await generateCard(ootdData, userId);
    await incrementCardCount(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "카드 생성 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
