"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import type { ItemCategory } from "@/types";
import type { AnalyzeResponse } from "@/types/api";
import ItemBadge from "./ItemBadge";

type EditableItem = AnalyzeResponse["items"][number];

const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: "top", label: "상의" },
  { value: "bottom", label: "하의" },
  { value: "outer", label: "아우터" },
  { value: "shoes", label: "신발" },
  { value: "bag", label: "가방" },
  { value: "accessory", label: "액세서리" },
  { value: "hat", label: "모자" },
  { value: "glasses", label: "안경" },
  { value: "watch", label: "시계" },
  { value: "other", label: "기타" },
];

interface ItemEditCardProps {
  item: EditableItem;
  index: number;
  onChange: (index: number, updated: EditableItem) => void;
}

export default function ItemEditCard({
  item,
  index,
  onChange,
}: ItemEditCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditableItem>(item);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (editing) firstInputRef.current?.focus();
  }, [editing]);

  const handleEdit = () => {
    setDraft(item);
    setEditing(true);
  };

  const handleSave = () => {
    onChange(index, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(item);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (editing) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">카테고리</label>
          <select
            ref={firstInputRef}
            value={draft.category}
            onChange={(e) =>
              setDraft({ ...draft, category: e.target.value as ItemCategory })
            }
            onKeyDown={handleKeyDown}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">색상</label>
          <input
            type="text"
            value={draft.color ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, color: e.target.value || null })
            }
            onKeyDown={handleKeyDown}
            placeholder="예: 화이트, #ffffff"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500">
            스타일 설명
          </label>
          <input
            type="text"
            value={draft.style_description ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, style_description: e.target.value || null })
            }
            onKeyDown={handleKeyDown}
            placeholder="예: 오버핏 크루넥 스웨터"
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
          />
        </div>

        <div className="flex gap-1.5">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-zinc-500">
              브랜드 (선택)
            </label>
            <input
              type="text"
              value={draft.brand ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, brand: e.target.value || null })
              }
              onKeyDown={handleKeyDown}
              placeholder="예: 유니클로"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs font-medium text-zinc-500">
              제품명 (선택)
            </label>
            <input
              type="text"
              value={draft.product_name ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, product_name: e.target.value || null })
              }
              onKeyDown={handleKeyDown}
              placeholder="예: 머니플리스"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleCancel}
            className="flex-1 h-9 rounded-full border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-9 rounded-full bg-zinc-900 text-sm text-white hover:bg-zinc-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleEdit}
      className="w-full text-left rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col gap-2 hover:border-zinc-400 hover:shadow-sm transition-all group"
      aria-label={`${item.category} 아이템 편집`}
    >
      <div className="flex items-start justify-between gap-2">
        <ItemBadge item={item} size="sm" />
        <span className="text-xs text-zinc-400 group-hover:text-zinc-600 transition-colors shrink-0 mt-0.5">
          편집
        </span>
      </div>
      {item.style_description && (
        <p className="text-sm text-zinc-700 leading-relaxed">
          {item.style_description}
        </p>
      )}
      {(item.brand || item.product_name) && (
        <p className="text-xs text-zinc-400">
          {[item.brand, item.product_name].filter(Boolean).join(" · ")}
        </p>
      )}
    </button>
  );
}
