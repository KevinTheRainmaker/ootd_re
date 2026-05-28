import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import {
  validateImageFile,
  uploadOriginalImage,
  type AllowedMime,
} from "@/lib/storage";
import type { UploadResponse, ApiError } from "@/types/api";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<UploadResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "요청 파싱 실패" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file 필드가 없습니다." },
      { status: 400 },
    );
  }

  const validation = validateImageFile(file.type, file.size);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.reason }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await uploadOriginalImage(
      buffer,
      file.type as AllowedMime,
      session.user.id,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { error: error.message ?? "업로드 실패" },
      { status: 500 },
    );
  }
}
