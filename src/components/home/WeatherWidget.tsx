"use client";
import { useEffect, useState } from "react";

interface WeatherData {
  temp: number;
  humidity: number;
  condition: string;
  description: string;
}

const WEATHER_BG: Record<string, string> = {
  Clear: "from-sky-300 to-blue-400",
  Clouds: "from-zinc-300 to-slate-400",
  Rain: "from-slate-500 to-zinc-600",
  Drizzle: "from-slate-400 to-zinc-500",
  Snow: "from-slate-100 to-white",
  Thunderstorm: "from-zinc-700 to-slate-800",
};

export default function WeatherWidget({
  onTempReady,
}: {
  onTempReady?: (temp: number) => void;
}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(true);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`,
          );
          if (!res.ok) throw new Error();
          const data: WeatherData = await res.json();
          setWeather(data);
          onTempReady?.(data.temp);
        } catch {
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError(true);
        setLoading(false);
      },
    );
  }, []);

  const bgClass = weather
    ? (WEATHER_BG[weather.condition] ?? "from-zinc-200 to-zinc-300")
    : "from-zinc-200 to-zinc-300";

  if (loading)
    return (
      <div className="w-full rounded-2xl bg-zinc-100 animate-pulse h-32" />
    );
  if (error || !weather) return null;

  return (
    <div
      className={`w-full rounded-2xl bg-gradient-to-br ${bgClass} p-5 text-white`}
    >
      <div className="flex items-end justify-between">
        <div>
          <div className="text-5xl font-bold">{weather.temp}°</div>
          <div className="text-sm mt-1 opacity-90">{weather.description}</div>
        </div>
        <div className="text-right text-sm opacity-80">
          <div>습도 {weather.humidity}%</div>
        </div>
      </div>
    </div>
  );
}
