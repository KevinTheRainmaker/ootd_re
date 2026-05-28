import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getAuthSession } from "@/lib/auth";
import {
  getOotdRecord,
  updateOotdRecord,
  deleteOotdRecord,
} from "@/lib/db/ootd";
import type { ApiError } from "@/types/api";
import type { OotdRecord } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<OotdRecord | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const record = await getOotdRecord(id);

  if (!record || record.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<OotdRecord | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: Partial<Pick<OotdRecord, "is_public" | "memo">>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  try {
    const updates: Parameters<typeof updateOotdRecord>[2] = {};

    if (typeof body.memo !== "undefined") updates.memo = body.memo;

    if (typeof body.is_public !== "undefined") {
      updates.is_public = body.is_public;
      if (body.is_public) {
        const current = await getOotdRecord(id);
        updates.share_id = current?.share_id ?? nanoid(8);
      } else {
        updates.share_id = null;
      }
    }

    const record = await updateOotdRecord(id, session.user.id, updates);
    return NextResponse.json(record, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "수정 실패" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<{ ok: true } | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteOotdRecord(id, session.user.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "삭제 실패" },
      { status: 500 },
    );
  }
}
