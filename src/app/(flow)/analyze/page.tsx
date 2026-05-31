"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import ItemEditCard from "@/components/ootd/ItemEditCard";
import type { AnalyzeResponse, GenerateCardRequest } from "@/types/api";

const ANALYSIS_STEPS = [
  "실루엣을 분석하는 중...",
  "원단 텍스처를 파악하는 중...",
  "스타일 데이터베이스와 매칭 중...",
  "아이템을 식별하는 중...",
];

function AnalyzePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const imageUrl = params.get("image_url");

  const [analyzing, setAnalyzing] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [items, setItems] = useState<AnalyzeResponse["items"]>([]);
  const [generating, setGenerating] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    if (!imageUrl) {
      router.replace("/upload");
      return;
    }

    const stepTimer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % ANALYSIS_STEPS.length);
    }, 1200);

    const run = async () => {
      try {
        const res = await fetch("/api/ootd/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl }),
        });

        if (!res.ok) {
          const err = await res.json();
          if (err.code === "not_fashion") {
            addToast("패션 사진에서 사람을 인식할 수 없습니다.", "error");
          } else {
            addToast(err.error ?? "분석에 실패했습니다.", "error");
          }
          return;
        }

        const data: AnalyzeResponse = await res.json();
        setResult(data);
        setItems(data.items);
      } catch {
        addToast("네트워크 오류가 발생했습니다.", "error");
      } finally {
        clearInterval(stepTimer);
        setAnalyzing(false);
      }
    };

    run();
    return () => clearInterval(stepTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, router]);

  const handleItemChange = useCallback(
    (index: number, updated: AnalyzeResponse["items"][number]) => {
      setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
    },
    [],
  );

  const handleGenerateCard = async () => {
    if (!imageUrl || !result) return;
    setGenerating(true);

    const payload: GenerateCardRequest = {
      ootd_data: {
        original_image_url: imageUrl,
        items,
        summary: result.summary,
        hashtags: result.hashtags,
      },
    };

    try {
      const res = await fetch("/api/ootd/generate-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.code === "monthly_limit_exceeded") {
          addToast("이번 달 카드 생성 한도에 도달했습니다.", "error");
        } else {
          addToast(err.error ?? "카드 생성에 실패했습니다.", "error");
        }
        return;
      }

      const { card_image_url } = await res.json();
      sessionStorage.setItem(
        "ootdData",
        JSON.stringify({
          items,
          summary: result.summary,
          hashtags: result.hashtags,
          original_image_url: imageUrl,
          card_image_url,
        }),
      );
      router.push("/card");
    } catch {
      addToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setGenerating(false);
    }
  };

  if (analyzing) {
    return (
      <main className="flex flex-col min-h-screen bg-[#fdf8f8] px-4 pt-8 gap-4">
        <h1 className="text-[24px] font-semibold font-display text-[#1c1b1b]">
          착장 분석 중
        </h1>

        {/* 업로드된 사진 + 스캐너 오버레이 */}
        <div className="relative w-full aspect-[3/4] max-w-sm mx-auto rounded-[24px] overflow-hidden bg-[#f1edec]">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="업로드된 착장 사진"
              className="w-full h-full object-cover"
            />
          )}
          <div className="scanner-line" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-transparent" />
        </div>

        {/* 분석 단계 카드 */}
        <div className="glass-card bg-white/80 rounded-[24px] p-4 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-sm mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-white text-sm">
                auto_awesome
              </span>
            </div>
            <p className="text-sm font-medium text-[#1c1b1b]">
              {ANALYSIS_STEPS[stepIndex]}
            </p>
          </div>
        </div>

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex flex-col items-center min-h-screen bg-[#fdf8f8] px-4 py-10 gap-6">
        <header className="text-center">
          <h1 className="text-[24px] font-semibold font-display text-[#1c1b1b]">
            분석 실패
          </h1>
          <p className="mt-1 text-sm text-[#444748]">다시 시도해보세요</p>
        </header>
        <Button onClick={() => router.push("/upload")}>다시 업로드</Button>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-[#fdf8f8] px-4 py-10 gap-6">
      <header className="text-center">
        <h1 className="text-[24px] font-semibold font-display text-[#1c1b1b]">
          분석 결과
        </h1>
        <p className="mt-1 text-sm text-[#444748]">
          아이템을 클릭해서 수정할 수 있어요
        </p>
      </header>

      {/* 원본 이미지 미리보기 */}
      {imageUrl && (
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="업로드된 착장 사진"
            className="w-full rounded-[24px] object-cover max-h-64"
          />
        </div>
      )}

      {/* 전체 스타일 요약 */}
      <section className="w-full max-w-sm flex flex-col gap-2">
        <h2 className="text-xs font-semibold text-[#444748] uppercase tracking-widest">
          스타일 요약
        </h2>
        <p className="text-base text-[#1c1b1b] leading-relaxed bg-white rounded-[24px] border border-[#f1edec] px-4 py-3 shadow-sm">
          {result.summary}
        </p>
        {result.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-[#444748] bg-[#f1edec] rounded-full px-3 py-1 font-semibold uppercase tracking-wide"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 아이템 리스트 */}
      <section className="w-full max-w-sm flex flex-col gap-3">
        <h2 className="text-xs font-semibold text-[#444748] uppercase tracking-widest">
          감지된 아이템 ({items.length})
        </h2>
        {items.map((item, idx) => (
          <ItemEditCard
            key={idx}
            item={item}
            index={idx}
            onChange={handleItemChange}
          />
        ))}
      </section>

      {/* CTA */}
      <div className="w-full max-w-sm flex flex-col gap-2 pb-6">
        <Button
          size="lg"
          className="w-full"
          onClick={handleGenerateCard}
          loading={generating}
          disabled={generating}
        >
          카드 생성하기
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="w-full text-[#747878]"
          onClick={() => router.push("/upload")}
          disabled={generating}
        >
          다시 업로드
        </Button>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col min-h-screen bg-[#fdf8f8] px-4 pt-8 gap-4">
          <h1 className="text-[24px] font-semibold font-display text-[#1c1b1b]">
            착장 분석 중
          </h1>
          <div className="relative w-full aspect-[3/4] max-w-sm mx-auto rounded-[24px] overflow-hidden bg-[#f1edec]">
            <div className="scanner-line" />
          </div>
          <div className="glass-card bg-white/80 rounded-[24px] p-4 border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.06)] max-w-sm mx-auto w-full">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-white text-sm">
                  auto_awesome
                </span>
              </div>
              <p className="text-sm font-medium text-[#1c1b1b]">
                아이템을 찾는 중...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <AnalyzePageInner />
    </Suspense>
  );
}
