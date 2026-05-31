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
      gradient: "from-[#FFD59E] via-[#FFEDD5] to-[#fdf8f8]",
      textDark: true,
    },
    Clouds: {
      gradient: "from-[#B0BEC5] via-[#CFD8DC] to-[#fdf8f8]",
      textDark: true,
    },
    Rain: {
      gradient: "from-[#546E7A] via-[#78909C] to-[#B0BEC5]",
      textDark: false,
    },
    Drizzle: {
      gradient: "from-[#607D8B] via-[#90A4AE] to-[#fdf8f8]",
      textDark: true,
    },
    Snow: {
      gradient: "from-[#E3F2FD] via-[#BBDEFB] to-[#fdf8f8]",
      textDark: true,
    },
    Thunderstorm: {
      gradient: "from-[#37474F] via-[#546E7A] to-[#78909C]",
      textDark: false,
    },
  };

function OutfitRecommendCard({
  temp,
  textDark,
}: {
  temp: number;
  textDark: boolean;
}) {
  const [items, setItems] = useState<OotdItem[]>([]);

  useEffect(() => {
    fetch(`/api/ootd/recommend?temp=${temp}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [temp]);

  if (items.length === 0)
    return (
      <div className="glass-card bg-white/60 rounded-[20px] p-3 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <p className="text-xs text-[#5d5e60] text-center">
          OOTD를 기록하면 코디를 추천해드려요
        </p>
      </div>
    );

  return (
    <div className="glass-card bg-white/70 rounded-[20px] p-3 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-2">
        <span className="bg-black text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
          AI Recommended
        </span>
        <span className="material-symbols-outlined text-lg text-[#5d5e60]">
          refresh
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex-shrink-0 h-16 w-12 rounded-xl bg-[#e5e2e1] flex items-center justify-center"
          >
            <span className="text-[10px] text-[#444748] text-center leading-tight px-1">
              {(item.style_description?.slice(0, 8) ?? item.category) || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeatherWidget({
  onTempReady,
}: {
  onTempReady?: (temp: number) => void;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          if (res.ok) {
            const data: WeatherData = await res.json();
            setWeather(data);
            onTempReady?.(data.temp);
          }
        } catch {
          // 날씨 로드 실패 시 위젯 숨김
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [onTempReady]);

  const config = weather
    ? (WEATHER_CONFIG[weather.condition] ?? WEATHER_CONFIG.Clouds)
    : WEATHER_CONFIG.Clear;
  const textColor = config.textDark ? "text-[#1c1b1b]" : "text-white";

  if (loading) {
    return (
      <div className="h-[200px] w-full rounded-[24px] bg-[#f1edec] animate-pulse" />
    );
  }

  if (!weather) return null;

  return (
    <section
      className={`relative h-[260px] w-full overflow-hidden rounded-[24px] bg-gradient-to-br ${config.gradient} mb-6`}
    >
      {/* 장식 원 */}
      <div className="absolute top-8 right-8 w-40 h-40 bg-white/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative h-full flex flex-col justify-between p-6">
        {/* 상단: 날씨 정보 */}
        <div className="flex justify-between items-start">
          <div>
            <h2
              className={`text-7xl font-bold leading-none ${textColor}`}
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {weather.temp}°
            </h2>
            <div
              className={`flex gap-3 mt-2 ${config.textDark ? "text-[#5d5e60]" : "text-white/80"}`}
            >
              <span className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">
                  humidity_percentage
                </span>
                {weather.humidity}%
              </span>
              <span className="text-xs font-semibold uppercase tracking-widest">
                {weather.description}
              </span>
            </div>
          </div>
          <div
            className={`text-right ${config.textDark ? "text-[#5d5e60]" : "text-white/80"}`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest">
              {new Date().toLocaleDateString("ko-KR", { weekday: "short" })}
            </p>
            <p className="text-lg font-semibold">
              {new Date().toLocaleDateString("ko-KR", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* 하단: AI 추천 Glassmorphism 카드 */}
        <OutfitRecommendCard temp={weather.temp} textDark={config.textDark} />
      </div>
    </section>
  );
}
