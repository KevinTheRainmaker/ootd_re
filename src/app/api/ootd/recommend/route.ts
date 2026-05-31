import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const temp = parseFloat(searchParams.get("temp") ?? "20");

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: records } = await supabaseAdmin
    .from("ootd_records")
    .select("ootd_items(*)")
    .eq("user_id", session.user.id)
    .gte("date", since.toISOString().slice(0, 10))
    .limit(20);

  const allItems =
    records?.flatMap((r: Record<string, unknown>) => {
      const items = r.ootd_items;
      return Array.isArray(items) ? items : [];
    }) ?? [];

  const needed =
    temp < 10
      ? ["outer", "top", "bottom"]
      : temp < 20
        ? ["top", "bottom", "outer"]
        : ["top", "bottom"];

  const recommended = needed
    .map((cat) => {
      const candidates = allItems.filter(
        (i: Record<string, unknown>) => i.category === cat,
      );
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    })
    .filter(Boolean);

  return NextResponse.json({ items: recommended.slice(0, 3) });
}
