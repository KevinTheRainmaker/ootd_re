import { NextRequest, NextResponse } from "next/server";
import { deleteOldFreeUserRecords } from "@/lib/db/ootd";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Vercel Cron Job — 매일 새벽 3시 실행
 * 무료 사용자의 30일 이전 OOTD를 DB + Storage에서 삭제
 *
 * vercel.json 에서 호출됨:
 * { "path": "/api/cron/cleanup", "schedule": "0 18 * * *" }  ← UTC 18:00 = KST 03:00
 */
export async function GET(req: NextRequest) {
  // Vercel Cron 요청 인증 (CRON_SECRET 환경변수로 보호)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { deleted, imageUrls } = await deleteOldFreeUserRecords();

    // Supabase Storage 이미지 삭제 (버킷별로 경로 추출)
    let storageDeleted = 0;
    if (imageUrls.length > 0) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const pathsToDelete: { bucket: string; path: string }[] = [];

      for (const url of imageUrls) {
        if (!url.startsWith(supabaseUrl)) continue;
        const match = url.match(
          /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/,
        );
        if (match) pathsToDelete.push({ bucket: match[1], path: match[2] });
      }

      // 버킷별 그룹핑 후 삭제
      const byBucket = pathsToDelete.reduce<Record<string, string[]>>(
        (acc, { bucket, path }) => {
          (acc[bucket] ??= []).push(path);
          return acc;
        },
        {},
      );

      for (const [bucket, paths] of Object.entries(byBucket)) {
        const { error } = await supabaseAdmin.storage
          .from(bucket)
          .remove(paths);
        if (!error) storageDeleted += paths.length;
      }
    }

    return NextResponse.json({
      ok: true,
      deleted_records: deleted,
      deleted_files: storageDeleted,
      ran_at: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { ok: false, error: e.message ?? "cleanup 실패" },
      { status: 500 },
    );
  }
}
