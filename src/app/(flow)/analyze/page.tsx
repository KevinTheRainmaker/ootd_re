"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import ItemEditCard from "@/components/ootd/ItemEditCard";
import type { AnalyzeResponse, GenerateCardRequest } from "@/types/api";

function AnalyzePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const imageUrl = params.get("image_url");

  const [analyzing, setAnalyzing] = useState(true);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [items, setItems] = useState<AnalyzeResponse["items"]>([]);
  const [generating, setGenerating] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    if (!imageUrl) {
      router.replace("/upload");
      return;
    }

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
        setAnalyzing(false);
      }
    };

    run();
    // addToast는 렌더 간 안정적 참조 보장 안 되므로 의존성에서 제외
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
      <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            착장 분석 중
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            AI가 아이템을 찾고 있어요
          </p>
        </header>
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
          <p className="text-sm text-zinc-500 animate-pulse">
            잠시만 기다려주세요...
          </p>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            분석 실패
          </h1>
          <p className="mt-1 text-sm text-zinc-500">다시 시도해보세요</p>
        </header>
        <Button onClick={() => router.push("/upload")}>다시 업로드</Button>
        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
          분석 결과
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
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
            className="w-full rounded-2xl object-cover max-h-64"
          />
        </div>
      )}

      {/* 전체 스타일 요약 */}
      <section className="w-full max-w-sm flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
          스타일 요약
        </h2>
        <p className="text-base text-zinc-800 leading-relaxed bg-white rounded-2xl border border-zinc-200 px-4 py-3">
          {result.summary}
        </p>
        {result.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {result.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-zinc-500 bg-zinc-100 rounded-full px-2.5 py-1"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 아이템 리스트 */}
      <section className="w-full max-w-sm flex flex-col gap-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
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
          className="w-full text-zinc-500"
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
        <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin mt-16" />
        </main>
      }
    >
      <AnalyzePageInner />
    </Suspense>
  );
}
