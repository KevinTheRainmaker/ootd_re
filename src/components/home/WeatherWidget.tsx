"use client";

import { useEffect, useState } from "react";
import type { OotdItem } from "@/types";

interface WeatherData {
  temp: number;
  humidity: number;
  condition: string;
  description: string;
}

const WEATHER_CONFIG: Record<string, { gradient: string; textDark: boolean }> =
  {
    Clear: {
      gradient: "from-[#FFD59E] via-[#FFEDD5] to-[#FFF8EE]",
      textDark: true,
    },
    Clouds: {
      gradient: "from-[#C9D6DF] via-[#E2EAF0] to-[#F0F4F7]",
      textDark: true,
    },
    Rain: {
      gradient: "from-[#3A5068] via-[#5A7A96] to-[#8AAABB]",
      textDark: false,
    },
    Drizzle: {
      gradient: "from-[#6B8FA8] via-[#9BBDCE] to-[#C5D9E3]",
      textDark: true,
    },
    Snow: {
      gradient: "from-[#E8F4F8] via-[#D0E8F0] to-[#F0F8FF]",
      textDark: true,
    },
    Thunderstorm: {
      gradient: "from-[#2C3E50] via-[#3D5166] to-[#5A7389]",
      textDark: false,
    },
  };

/** 날씨 없을 때 시간대별 기본 그라디언트 */
function getDefaultConfig(): { gradient: string; textDark: boolean } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10)
    return {
      gradient: "from-[#FFD59E] via-[#FFEDD5] to-[#FFF8EE]",
      textDark: true,
    };
  if (hour >= 10 && hour < 17)
    return {
      gradient: "from-[#AED6F1] via-[#D6EAF8] to-[#EBF5FB]",
      textDark: true,
    };
  if (hour >= 17 && hour < 20)
    return {
      gradient: "from-[#E59866] via-[#F0B27A] to-[#FAD7A0]",
      textDark: true,
    };
  return {
    gradient: "from-[#1A252F] via-[#2C3E50] to-[#3D566E]",
    textDark: false,
  };
}

function OutfitRecommendCard({ temp }: { temp: number | null }) {
  const [items, setItems] = useState<OotdItem[]>([]);

  useEffect(() => {
    if (temp === null) return;
    fetch(`/api/ootd/recommend?temp=${temp}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [temp]);

  return (
    <div className="glass-card bg-white/65 rounded-[20px] p-3 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between mb-2">
        <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
          AI Recommended
        </span>
        <span className="material-symbols-outlined text-lg text-[#5d5e60] cursor-pointer">
          refresh
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-[#5d5e60] text-center py-2">
          OOTD를 기록하면 날씨에 맞는 코디를 추천해드려요
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex-shrink-0 h-16 w-12 rounded-xl bg-[#e5e2e1] flex items-center justify-center"
            >
              <span className="text-[10px] text-[#444748] text-center leading-tight px-1">
                {item.style_description?.slice(0, 8) ?? item.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type LoadState = "loading" | "no-permission" | "no-key" | "error" | "ready";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    if (!navigator.geolocation) {
      setState("no-permission");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          if (res.status === 500) {
            setState("no-key");
            return;
          }
          if (res.ok) {
            setWeather(await res.json());
            setState("ready");
          } else {
            setState("error");
          }
        } catch {
          setState("error");
        }
      },
      () => setState("no-permission"),
      { timeout: 8000 },
    );
  }, []);

  const config =
    weather && WEATHER_CONFIG[weather.condition]
      ? WEATHER_CONFIG[weather.condition]
      : getDefaultConfig();

  const textColor = config.textDark ? "text-[#1c1b1b]" : "text-white";
  const subColor = config.textDark ? "text-[#5d5e60]" : "text-white/75";

  const now = new Date();
  const dayLabel = now
    .toLocaleDateString("en-US", { weekday: "long" })
    .toUpperCase();
  const dateLabel = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <section
      className={`relative w-full overflow-hidden rounded-[28px] bg-gradient-to-br ${config.gradient} mb-4`}
      style={{ minHeight: "30dvh" }}
    >
      {/* 장식 */}
      <div className="absolute top-6 right-6 w-36 h-36 bg-white/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-12 left-4 w-20 h-20 bg-white/10 rounded-full blur-2xl pointer-events-none" />

      <div
        className="relative flex flex-col justify-between p-6 gap-4"
        style={{ minHeight: "30dvh" }}
      >
        {/* 상단: 날씨 정보 */}
        <div className="flex justify-between items-start">
          <div>
            {state === "loading" ? (
              <div className="space-y-2">
                <div className="h-16 w-28 bg-white/30 rounded-2xl animate-pulse" />
                <div className="h-4 w-36 bg-white/20 rounded-full animate-pulse" />
              </div>
            ) : state === "ready" && weather ? (
              <>
                <h2
                  className={`text-8xl font-bold leading-none ${textColor}`}
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {weather.temp}°
                </h2>
                <div className={`flex gap-3 mt-2 ${subColor}`}>
                  <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      humidity_percentage
                    </span>
                    {weather.humidity}%
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">
                      {weather.condition === "Clear"
                        ? "sunny"
                        : weather.condition === "Rain"
                          ? "rainy"
                          : weather.condition === "Snow"
                            ? "ac_unit"
                            : "cloud"}
                    </span>
                    {weather.description}
                  </span>
                </div>
              </>
            ) : (
              <div>
                <p className={`text-sm font-semibold ${subColor}`}>
                  {state === "no-permission"
                    ? "위치 권한을 허용하면 날씨를 표시해요"
                    : state === "no-key"
                      ? "날씨 API 키를 설정해주세요"
                      : "날씨를 불러올 수 없어요"}
                </p>
              </div>
            )}
          </div>

          <div className={`text-right ${subColor}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest">
              {dayLabel}
            </p>
            <p
              className={`text-xl font-bold ${textColor}`}
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {dateLabel}
            </p>
          </div>
        </div>

        {/* 하단: AI 추천 카드 */}
        <OutfitRecommendCard
          temp={state === "ready" && weather ? weather.temp : null}
        />
      </div>
    </section>
  );
}
