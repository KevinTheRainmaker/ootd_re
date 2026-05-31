"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OotdRecord, Mood } from "@/types";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

const MOOD_COLORS: Record<Mood, string> = {
  passion: "bg-[#E57373]",
  happy: "bg-[#90CAF9]",
  calm: "bg-[#66BB6A]",
  cozy: "bg-[#D4E157]",
  creative: "bg-[#CE93D8]",
};

const MOOD_LABELS: Record<Mood, string> = {
  passion: "Energetic",
  happy: "Productive",
  calm: "Calm",
  cozy: "Minimal",
  creative: "Creative",
};

function toYM(date: Date) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export default function HomeCalendar() {
  const router = useRouter();
  const [current, setCurrent] = useState(() => toYM(new Date()));
  const [records, setRecords] = useState<OotdRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(
    async (year: number, month: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/ootd/calendar?year=${year}&month=${month}`,
        );
        if (res.status === 401) {
          router.replace("/auth/signin");
          return;
        }
        if (res.ok) setRecords(await res.json());
      } catch {}
      setLoading(false);
    },
    [router],
  );

  useEffect(() => {
    fetchRecords(current.year, current.month);
  }, [current, fetchRecords]);

  const ootdByDay = records.reduce(
    (acc, r) => {
      const day = new Date(r.date + "T00:00:00").getDate();
      if (!acc[day]) acc[day] = [];
      acc[day].push(r);
      return acc;
    },
    {} as Record<number, OotdRecord[]>,
  );

  const today = new Date();
  const isCurrentMonth =
    current.year === today.getFullYear() &&
    current.month === today.getMonth() + 1;

  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  const firstDayOfWeek = new Date(current.year, current.month - 1, 1).getDay();
  const daysInPrevMonth = new Date(
    current.year,
    current.month - 1,
    0,
  ).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, current: false });
    }
  }

  const goPrev = () =>
    setCurrent(({ year, month }) =>
      month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    );

  const goNext = () =>
    setCurrent(({ year, month }) =>
      month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 },
    );

  return (
    <section className="px-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[24px] font-bold font-display text-[#1c1b1b] tracking-tight">
          Daily Rituals
        </h2>
        <div className="flex gap-1.5">
          <button
            onClick={goPrev}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1edec] hover:bg-[#e5e2e1] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-[#444748]">
              chevron_left
            </span>
          </button>
          <button
            onClick={goNext}
            disabled={isCurrentMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f1edec] hover:bg-[#e5e2e1] transition-colors disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-[18px] text-[#444748]">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* 캘린더 카드 */}
      <div className="bg-white rounded-[32px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        {/* 월 표시 */}
        <p className="text-xs font-semibold text-[#747878] uppercase tracking-widest mb-4 text-center">
          {MONTH_NAMES[current.month - 1]} {current.year}
        </p>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_NAMES.map((d, i) => (
            <div
              key={i}
              className="text-center text-[11px] font-semibold text-[#747878] uppercase tracking-widest py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#e5e2e1] border-t-black rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-y-2">
            {cells.map((cell, idx) => {
              const isToday =
                cell.current && isCurrentMonth && cell.day === today.getDate();
              const dayOotds = cell.current ? (ootdByDay[cell.day] ?? []) : [];
              const moods = dayOotds
                .map((r) => r.mood)
                .filter(Boolean)
                .slice(0, 3) as Mood[];

              return (
                <div
                  key={idx}
                  className="flex flex-col items-center gap-0.5 cursor-pointer"
                  onClick={() => {
                    if (cell.current && dayOotds.length > 0) {
                      router.push(`/ootd/${dayOotds[0].id}`);
                    }
                  }}
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full text-sm
                      ${!cell.current ? "text-[#c4c7c7]" : "text-[#1c1b1b]"}
                      ${isToday ? "ring-2 ring-black font-bold" : ""}
                    `}
                  >
                    {cell.day}
                  </span>
                  {moods.length > 0 && (
                    <div className="flex gap-[3px]">
                      {moods.map((m, mi) => (
                        <div
                          key={mi}
                          className={`w-1.5 h-1.5 rounded-full ${MOOD_COLORS[m]}`}
                        />
                      ))}
                    </div>
                  )}
                  {moods.length === 0 && <div className="h-2" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 무드 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
        {(["passion", "calm", "happy", "cozy"] as Mood[]).map((m) => (
          <div key={m} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${MOOD_COLORS[m]}`} />
            <span className="text-[11px] text-[#747878] font-medium">
              {MOOD_LABELS[m]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
