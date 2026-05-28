"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import OotdCard, { OotdCardSkeleton } from "@/components/calendar/OotdCard";
import Button from "@/components/ui/Button";
import type { OotdRecord } from "@/types";

const MONTH_NAMES = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

function toYM(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export default function CalendarPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(() => toYM(new Date()));
  const [records, setRecords] = useState<OotdRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(
    async (year: number, month: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/ootd/calendar?year=${year}&month=${month}`,
        );
        if (res.status === 401) {
          router.replace("/auth/signin");
          return;
        }
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "불러오기 실패");
        }
        const data: OotdRecord[] = await res.json();
        setRecords(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchRecords는 비동기 콜백 내부에서 setState 호출, 직접 동기 호출 아님
    fetchRecords(current.year, current.month);
  }, [current, fetchRecords]);

  const goPrev = () =>
    setCurrent(({ year, month }) => {
      if (month === 1) return { year: year - 1, month: 12 };
      return { year, month: month - 1 };
    });

  const goNext = () =>
    setCurrent(({ year, month }) => {
      if (month === 12) return { year: year + 1, month: 1 };
      return { year, month: month + 1 };
    });

  const isThisMonth = (() => {
    const now = toYM(new Date());
    return current.year === now.year && current.month === now.month;
  })();

  return (
    <main className="flex flex-col min-h-screen bg-zinc-50 px-4 py-8 gap-6 max-w-md mx-auto w-full">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-600"
          aria-label="이전 달"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>

        <h1 className="text-base font-semibold text-zinc-900">
          {current.year}년 {MONTH_NAMES[current.month - 1]}
        </h1>

        <button
          onClick={goNext}
          disabled={isThisMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="다음 달"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </button>
      </div>

      {/* 그리드 */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <OotdCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-zinc-500">{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchRecords(current.year, current.month)}
          >
            다시 시도
          </Button>
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-sm text-zinc-500">
            {MONTH_NAMES[current.month - 1]}에 기록된 착장이 없어요.
          </p>
          <Button size="sm" onClick={() => router.push("/upload")}>
            오늘 착장 기록하기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {records.map((r) => (
            <OotdCard key={r.id} record={r} />
          ))}
        </div>
      )}
    </main>
  );
}
