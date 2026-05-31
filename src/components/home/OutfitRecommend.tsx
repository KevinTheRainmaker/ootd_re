"use client";
import { useEffect, useState } from "react";
import type { OotdItem } from "@/types";

export default function OutfitRecommend({ temp }: { temp: number | null }) {
  const [items, setItems] = useState<OotdItem[]>([]);

  useEffect(() => {
    if (temp === null) return;
    fetch(`/api/ootd/recommend?temp=${temp}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {});
  }, [temp]);

  if (items.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
        오늘의 추천 코디
      </h2>
      <div className="flex gap-2 flex-wrap">
        {items.map((item, i) => (
          <span
            key={i}
            className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-3 py-1"
          >
            {item.style_description ?? item.category}
          </span>
        ))}
      </div>
    </div>
  );
}
