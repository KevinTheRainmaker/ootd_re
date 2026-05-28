import type { ItemCategory, OotdItem } from "@/types";

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  top: "상의",
  bottom: "하의",
  outer: "아우터",
  shoes: "신발",
  bag: "가방",
  accessory: "액세서리",
  hat: "모자",
  glasses: "안경",
  watch: "시계",
  other: "기타",
};

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  top: "bg-blue-50 text-blue-700 border-blue-100",
  bottom: "bg-indigo-50 text-indigo-700 border-indigo-100",
  outer: "bg-amber-50 text-amber-700 border-amber-100",
  shoes: "bg-pink-50 text-pink-700 border-pink-100",
  bag: "bg-purple-50 text-purple-700 border-purple-100",
  accessory: "bg-emerald-50 text-emerald-700 border-emerald-100",
  hat: "bg-orange-50 text-orange-700 border-orange-100",
  glasses: "bg-cyan-50 text-cyan-700 border-cyan-100",
  watch: "bg-zinc-100 text-zinc-700 border-zinc-200",
  other: "bg-zinc-50 text-zinc-500 border-zinc-100",
};

interface ItemBadgeProps {
  item: Pick<OotdItem, "category" | "color" | "brand" | "product_name">;
  size?: "sm" | "md";
}

export default function ItemBadge({ item, size = "md" }: ItemBadgeProps) {
  const label = CATEGORY_LABELS[item.category];
  const colorClass = CATEGORY_COLORS[item.category];

  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-full border font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        colorClass,
      ].join(" ")}
    >
      {item.color && item.color.startsWith("#") && (
        <span
          className="w-3 h-3 rounded-full border border-white/50 shrink-0"
          style={{ backgroundColor: item.color }}
          aria-label={`색상: ${item.color}`}
        />
      )}
      <span>{label}</span>
      {item.color && !item.color.startsWith("#") && (
        <span className="opacity-60 text-xs">{item.color}</span>
      )}
      {item.brand && (
        <span className="opacity-60 truncate max-w-24">{item.brand}</span>
      )}
    </div>
  );
}
