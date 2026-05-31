import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getAllOotdsByUser } from "@/lib/db/ootd";

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await getAllOotdsByUser(session.user.id);
    return NextResponse.json(records, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "불러오기 실패" },
      { status: 500 },
    );
  }
}
