import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { uploadCardImage } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "배경 제거 API 키가 설정되지 않았습니다.", code: "no_api_key" },
      { status: 503 },
    );
  }

  let imageUrl: string;
  try {
    const body = await req.json();
    imageUrl = body.image_url;
    if (!imageUrl) throw new Error("image_url 없음");
  } catch {
    return NextResponse.json(
      { error: "image_url이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    // remove.bg API 호출
    const formData = new FormData();
    formData.append("image_url", imageUrl);
    formData.append("size", "auto");
    formData.append("format", "png");

    const rbgRes = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: formData,
    });

    if (!rbgRes.ok) {
      const errText = await rbgRes.text();
      return NextResponse.json(
        { error: `배경 제거 실패: ${rbgRes.status} ${errText}` },
        { status: 502 },
      );
    }

    const pngBuffer = Buffer.from(await rbgRes.arrayBuffer());

    // Supabase Storage에 투명 PNG 저장
    const { url } = await uploadCardImage(pngBuffer, session.user.id);

    return NextResponse.json({ removed_url: url }, { status: 200 });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { error: e.message ?? "배경 제거 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
