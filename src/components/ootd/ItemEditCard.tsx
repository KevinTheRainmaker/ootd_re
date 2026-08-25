"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ITEM_CATEGORIES } from "@/types";
import type { ItemCategory } from "@/types";
import type { AnalyzeResponse } from "@/types/api";
import ItemBadge from "./ItemBadge";

type EditableItem = AnalyzeResponse["items"][number];

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

const CATEGORY_OPTIONS = ITEM_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABELS[value],
}));

interface ItemEditCardProps {
  item: EditableItem;
  index: number;
  onChange: (index: number, updated: EditableItem) => void;
  onDelete: (index: number) => void;
  extractionStatus?: "manual" | "pending" | "processing" | "ready" | "failed";
  onRetry?: () => void;
}

export default function ItemEditCard({
  item,
  index,
  onChange,
  onDelete,
  extractionStatus = "manual",
  onRetry,
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
        {(item.image_url || item.crop_image_url) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url ?? item.crop_image_url ?? ""}
            alt="분리된 의류 미리보기"
            className="h-32 w-full rounded-xl bg-zinc-50 object-contain"
          />
        )}
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
            type="button"
            onClick={() => onDelete(index)}
            className="h-9 rounded-full px-4 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 h-9 rounded-full border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-9 rounded-full bg-zinc-900 text-sm text-white hover:bg-zinc-700 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  const previewUrl = item.image_url ?? item.crop_image_url;

  return (
    <div className="w-full text-left rounded-2xl border border-zinc-200 bg-white p-4 flex gap-3 hover:border-zinc-400 hover:shadow-sm transition-all group">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="분리된 의류"
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="material-symbols-outlined flex h-full items-center justify-center text-zinc-300">
            checkroom
          </span>
        )}
        {extractionStatus === "processing" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <ItemBadge item={item} size="sm" />
          <button
            type="button"
            onClick={handleEdit}
            className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-zinc-700"
            aria-label={`${item.category} 아이템 편집`}
          >
            편집
          </button>
        </div>
        {item.style_description && (
          <p className="text-sm leading-relaxed text-zinc-700">
            {item.style_description}
          </p>
        )}
        {(item.brand || item.product_name) && (
          <p className="text-xs text-zinc-400">
            {[item.brand, item.product_name].filter(Boolean).join(" · ")}
          </p>
        )}
        {extractionStatus === "processing" && (
          <p className="text-xs text-zinc-500">빈 의류 이미지로 분리하는 중...</p>
        )}
        {extractionStatus === "failed" && (
          <button
            type="button"
            onClick={onRetry}
            className="self-start text-xs font-medium text-red-600 hover:text-red-800"
          >
            이미지 추출 다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
