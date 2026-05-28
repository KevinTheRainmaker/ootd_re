import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { checkCardLimit } from "@/lib/usage";
import type { ApiError } from "@/types/api";
import type { UsageLimitInfo } from "@/types";

export async function GET(): Promise<NextResponse<UsageLimitInfo | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const info = await checkCardLimit(session.user.id);
    return NextResponse.json(info, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "사용량 조회 실패" },
      { status: 500 },
    );
  }
}
