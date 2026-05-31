"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { OotdRecord, Mood } from "@/types";

const MOOD_COLORS: Record<Mood, string> = {
  passion: "bg-[#E57373]",
  happy: "bg-[#90CAF9]",
  calm: "bg-[#66BB6A]",
  cozy: "bg-[#D4E157]",
  creative: "bg-[#CE93D8]",
};

export default function MyOotdPage() {
  const router = useRouter();
  const [records, setRecords] = useState<OotdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ootd/list");
      if (res.status === 401) {
        router.replace("/auth/signin");
        return;
      }
      if (!res.ok) throw new Error("불러오기 실패");
      setRecords(await res.json());
    } catch {
      setError("OOTD를 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="min-h-screen bg-[#fdf8f8] pb-28">
      {/* 헤더 */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1edec] hover:bg-[#e5e2e1] transition-colors"
        >
          <span className="material-symbols-outlined text-[18px] text-[#444748]">
            arrow_back
          </span>
        </button>
        <h1
          className="text-[22px] font-bold text-[#1c1b1b]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          My OOTD
        </h1>
        <span className="text-sm text-[#747878] mt-0.5">
          {records.length > 0 ? `${records.length}개` : ""}
        </span>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#e5e2e1] border-t-black rounded-full animate-spin" />
        </div>
      )}

      {/* 에러 */}
      {error && !loading && (
        <div className="flex flex-col items-center gap-4 py-20 px-4 text-center">
          <p className="text-sm text-[#747878]">{error}</p>
          <button
            onClick={load}
            className="text-xs font-semibold text-[#1c1b1b] underline"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && records.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-24 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f1edec] flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px] text-[#c4c7c7]">
              style
            </span>
          </div>
          <div>
            <p className="text-base font-semibold text-[#1c1b1b] mb-1">
              아직 기록된 OOTD가 없어요
            </p>
            <p className="text-sm text-[#747878]">오늘의 착장을 기록해보세요</p>
          </div>
          <button
            onClick={() => router.push("/upload")}
            className="bg-black text-white rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-widest"
          >
            착장 기록하기
          </button>
        </div>
      )}

      {/* 갤러리 그리드 */}
      {!loading && records.length > 0 && (
        <div className="px-4 pt-2">
          <div className="columns-2 gap-3 sm:columns-3">
            {records.map((record) => (
              <GalleryCard
                key={record.id}
                record={record}
                onClick={() => router.push(`/ootd/${record.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function GalleryCard({
  record,
  onClick,
}: {
  record: OotdRecord;
  onClick: () => void;
}) {
  const imageUrl = record.card_image_url || record.original_image_url;
  const dateStr = record.date
    ? new Date(record.date + "T00:00:00").toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div
      className="relative mb-3 break-inside-avoid cursor-pointer group"
      onClick={onClick}
    >
      {/* 이미지 */}
      <div className="relative overflow-hidden rounded-[20px] bg-[#e5e2e1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="OOTD"
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* 하단 오버레이 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-end justify-between">
            <span className="text-[11px] font-semibold text-white/90">
              {dateStr}
            </span>
            <div className="flex items-center gap-1.5">
              {/* 무드 점 */}
              {record.mood && (
                <div
                  className={`w-2 h-2 rounded-full ${MOOD_COLORS[record.mood as Mood] ?? "bg-white/60"}`}
                />
              )}
              {/* 공개 여부 */}
              {record.is_public && (
                <span className="material-symbols-outlined text-white/80 text-[14px]">
                  public
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
