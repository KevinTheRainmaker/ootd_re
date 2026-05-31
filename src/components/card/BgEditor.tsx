"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type BgStyle = "blur" | "color" | "transparent";

interface BgEditorProps {
  /** 원본 이미지 URL (블러 배경 + 배경 제거 입력용) */
  originalUrl: string;
  /** 합성 완료된 dataURL 전달 */
  onResult: (dataUrl: string) => void;
  /** 배경 제거 진행 상태 전달 */
  onLoadingChange?: (loading: boolean) => void;
}

const PRESET_COLORS = [
  { label: "흰색", value: "#ffffff" },
  { label: "아이보리", value: "#fdf8f0" },
  { label: "베이지", value: "#e8d5c4" },
  { label: "연회색", value: "#f1edec" },
  { label: "연블루", value: "#dce8f5" },
  { label: "연핑크", value: "#f5dce8" },
  { label: "연민트", value: "#dce8dc" },
  { label: "검정", value: "#1c1b1b" },
];

export default function BgEditor({
  originalUrl,
  onResult,
  onLoadingChange,
}: BgEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [bgStyle, setBgStyle] = useState<BgStyle>("blur");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [removedBlob, setRemovedBlob] = useState<Blob | null>(null);
  const [removing, setRemoving] = useState(false);
  const [compositing, setCompositing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 배경 제거 (WASM, 최초 1회) ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setRemoving(true);
      onLoadingChange?.(true);
      setError(null);
      try {
        // 동적 import — WASM 번들은 사용 시점에 로드
        const { removeBackground } = await import("@imgly/background-removal");
        const blob = await removeBackground(originalUrl, {
          publicPath: "/bg-removal-data/",
        });
        if (!cancelled) setRemovedBlob(blob);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "배경 제거에 실패했습니다.",
          );
      } finally {
        if (!cancelled) {
          setRemoving(false);
          onLoadingChange?.(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [originalUrl, onLoadingChange]);

  // ── Canvas 합성 ──────────────────────────────────────────────────────
  const compose = useCallback(
    async (style: BgStyle, color: string) => {
      if (!removedBlob || !canvasRef.current) return;
      setCompositing(true);
      try {
        const loadImg = (src: string | Blob): Promise<HTMLImageElement> =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src instanceof Blob ? URL.createObjectURL(src) : src;
          });

        const [fgImg, bgImg] = await Promise.all([
          loadImg(removedBlob),
          style === "blur" ? loadImg(originalUrl) : Promise.resolve(null),
        ]);

        const W = fgImg.naturalWidth;
        const H = fgImg.naturalHeight;
        const canvas = canvasRef.current;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, W, H);

        if (style === "blur" && bgImg) {
          ctx.filter = "blur(24px)";
          ctx.drawImage(bgImg, -20, -20, W + 40, H + 40);
          ctx.filter = "none";
        } else if (style === "color") {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, W, H);
        }
        // transparent: 배경 없이 인물만
        ctx.drawImage(fgImg, 0, 0, W, H);

        onResult(canvas.toDataURL("image/png"));
      } finally {
        setCompositing(false);
      }
    },
    [removedBlob, originalUrl, onResult],
  );

  // 배경 제거 완료 or 스타일·색상 변경 시 자동 합성
  useEffect(() => {
    if (removedBlob) compose(bgStyle, bgColor);
  }, [removedBlob, bgStyle, bgColor, compose]);

  // ── 렌더 ─────────────────────────────────────────────────────────────
  if (removing) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex items-center gap-2 text-xs text-[#747878]">
          <div className="w-3.5 h-3.5 border border-[#c4c7c7] border-t-black rounded-full animate-spin" />
          배경 제거 중... (처음 실행 시 30~60초 소요)
        </div>
        <p className="text-[10px] text-[#c4c7c7]">
          AI 모델을 브라우저에서 직접 실행합니다
        </p>
      </div>
    );
  }

  if (error) {
    return <p className="text-xs text-[#ba1a1a] py-2 text-center">{error}</p>;
  }

  if (!removedBlob) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      {compositing && (
        <div className="flex items-center gap-2 text-xs text-[#747878]">
          <div className="w-3 h-3 border border-[#c4c7c7] border-t-black rounded-full animate-spin" />
          배경 적용 중...
        </div>
      )}

      {/* 숨겨진 Canvas (합성용) */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 배경 스타일 */}
      <div>
        <p className="text-[10px] font-semibold text-[#747878] uppercase tracking-widest mb-2">
          배경 스타일
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { value: "blur", label: "블러", icon: "blur_on" },
              { value: "color", label: "단색", icon: "palette" },
              { value: "transparent", label: "투명", icon: "layers_clear" },
            ] as { value: BgStyle; label: string; icon: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setBgStyle(opt.value)}
              disabled={compositing}
              className={[
                "flex flex-col items-center gap-1.5 p-3 rounded-[16px] border transition-all",
                bgStyle === opt.value
                  ? "border-black bg-black text-white"
                  : "border-[#e5e2e1] bg-white text-[#444748]",
                compositing ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "material-symbols-outlined text-[22px]",
                  bgStyle === opt.value ? "text-white" : "text-[#5d5e60]",
                ].join(" ")}
              >
                {opt.icon}
              </span>
              <span className="text-[11px] font-semibold">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 단색 팔레트 */}
      {bgStyle === "color" && (
        <div>
          <p className="text-[10px] font-semibold text-[#747878] uppercase tracking-widest mb-2">
            배경 색상
          </p>
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setBgColor(c.value)}
                disabled={compositing}
                title={c.label}
                className={[
                  "w-9 h-9 rounded-full border-2 transition-all active:scale-95",
                  bgColor === c.value
                    ? "border-black scale-110 shadow-md"
                    : "border-[#e5e2e1]",
                ].join(" ")}
                style={{ backgroundColor: c.value }}
              />
            ))}
            {/* 직접 선택 */}
            <label
              className="w-9 h-9 rounded-full border-2 border-dashed border-[#c4c7c7] flex items-center justify-center cursor-pointer hover:border-black transition-colors"
              title="직접 선택"
            >
              <span className="material-symbols-outlined text-[16px] text-[#747878]">
                colorize
              </span>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                disabled={compositing}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
