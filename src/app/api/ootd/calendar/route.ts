import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getOotdsByUserAndMonth } from "@/lib/db/ootd";
import type { ApiError } from "@/types/api";
import type { OotdRecord } from "@/types";

export async function GET(
  req: NextRequest,
): Promise<NextResponse<OotdRecord[] | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const yearStr = searchParams.get("year");
  const monthStr = searchParams.get("month");

  const now = new Date();
  const year = yearStr ? parseInt(yearStr, 10) : now.getFullYear();
  const month = monthStr ? parseInt(monthStr, 10) : now.getMonth() + 1;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "year, month 파라미터가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  try {
    const records = await getOotdsByUserAndMonth(session.user.id, year, month);
    return NextResponse.json(records, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "조회 실패" },
      { status: 500 },
    );
  }
}
