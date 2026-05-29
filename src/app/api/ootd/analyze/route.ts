import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { analyzeOotdImage } from "@/lib/ai/vision";
import type { AnalyzeRequest, AnalyzeResponse, ApiError } from "@/types/api";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<AnalyzeResponse | ApiError>> {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: AnalyzeRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body.image_url) {
    return NextResponse.json(
      { error: "image_url이 필요합니다." },
      { status: 400 },
    );
  }

  try {
    // Supabase private 버킷 이미지를 Admin으로 직접 다운로드 → base64 변환
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    let imageDataUrl = body.image_url;

    if (body.image_url.startsWith(supabaseUrl)) {
      const match = body.image_url.match(
        /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/,
      );
      if (match) {
        const [, bucket, filePath] = match;
        // signed URL(60초)로 임시 접근 권한 생성 후 fetch
        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(filePath, 60);
        if (signError || !signed?.signedUrl)
          throw new Error("이미지 접근 실패: " + (signError?.message ?? ""));
        const res = await fetch(signed.signedUrl);
        if (!res.ok) throw new Error(`이미지 로드 실패: ${res.status}`);
        const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
        const ct = res.headers.get("content-type") ?? "image/jpeg";
        imageDataUrl = `data:${ct};base64,${base64}`;
      }
    }

    const result = await analyzeOotdImage(imageDataUrl);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "not_fashion") {
      return NextResponse.json(
        {
          error: "패션 사진에서 사람을 인식할 수 없습니다.",
          code: "not_fashion",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: e.message ?? "AI 분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
