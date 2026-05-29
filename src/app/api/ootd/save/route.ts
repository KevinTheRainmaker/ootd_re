import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAuthSession } from "@/lib/auth";
import { createOotdRecord, createOotdItems } from "@/lib/db/ootd";
import type { SaveOotdRequest, SaveOotdResponse, ApiError } from "@/types/api";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<SaveOotdResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SaveOotdRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body.original_image_url || !body.card_image_url) {
    return NextResponse.json(
      { error: "original_image_url과 card_image_url이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const shareId = body.is_public ? nanoid(8) : null;

    const record = await createOotdRecord({
      user_id: session.user.id,
      date: body.date ?? new Date().toISOString().slice(0, 10),
      original_image_url: body.original_image_url,
      card_image_url: body.card_image_url,
      style_summary: body.style_summary,
      hashtags: body.hashtags,
      is_public: body.is_public,
      share_id: shareId,
      memo: body.memo ?? null,
      plan_used: null,
    });

    if (body.items.length > 0) {
      await createOotdItems(
        body.items.map((item, idx) => ({
          ootd_id: record.id,
          category: item.category,
          color: item.color ?? null,
          style_description: item.style_description ?? null,
          brand: item.brand ?? null,
          product_name: item.product_name ?? null,
          order_idx: item.order_idx ?? idx,
        })),
      );
    }

    return NextResponse.json(
      { id: record.id, share_id: record.share_id },
      { status: 201 },
    );
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; details?: string };
    console.error("[save] 저장 실패:", err);
    return NextResponse.json(
      {
        error: e.message ?? "저장 실패",
        details: e.details ?? e.code ?? null,
      },
      { status: 500 },
    );
  }
}
