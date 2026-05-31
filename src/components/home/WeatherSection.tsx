"use client";
import { useState } from "react";
import WeatherWidget from "./WeatherWidget";
import OutfitRecommend from "./OutfitRecommend";

export default function WeatherSection() {
  const [temp, setTemp] = useState<number | null>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      <WeatherWidget onTempReady={setTemp} />
      <OutfitRecommend temp={temp} />
    </div>
  );
}
