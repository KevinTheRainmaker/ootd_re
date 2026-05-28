import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { checkCardLimit, incrementCardCount } from "@/lib/usage";
import { generateCard } from "@/lib/ai/card-gen";
import type {
  GenerateCardRequest,
  GenerateCardResponse,
  ApiError,
} from "@/types/api";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<GenerateCardResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

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

  let body: GenerateCardRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body.ootd_data?.original_image_url) {
    return NextResponse.json(
      { error: "ootd_data.original_image_url이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const result = await generateCard(body.ootd_data, userId);
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
