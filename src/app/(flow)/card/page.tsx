"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import CardPreview, {
  CardPreviewSkeleton,
} from "@/components/card/CardPreview";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import type { AnalyzeResponse } from "@/types/api";

interface OotdSessionData {
  items: AnalyzeResponse["items"];
  summary: string;
  hashtags: string[];
  original_image_url: string;
  card_image_url: string;
}

function CardPageInner() {
  const router = useRouter();

  const [ootdData, setOotdData] = useState<OotdSessionData | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ootdData");
      const data = raw ? (JSON.parse(raw) as OotdSessionData) : null;
      setOotdData(data);
      if (!data) router.replace("/upload");
    } catch {
      router.replace("/upload");
    }
  }, [router]);

  const handleDownload = useCallback(async () => {
    if (!ootdData?.card_image_url) return;
    try {
      const res = await fetch(ootdData.card_image_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ootd-card-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addToast("다운로드에 실패했습니다.", "error");
    }
  }, [ootdData, addToast]);

  const handleCopyLink = useCallback(async () => {
    if (!shareId) return;
    const url = `${location.origin}/share/${shareId}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast("링크가 복사됐습니다.", "success");
    } catch {
      addToast("링크 복사에 실패했습니다.", "error");
    }
  }, [shareId, addToast]);

  const handleSave = useCallback(async () => {
    if (saving || saved || !ootdData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ootd/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_image_url: ootdData.original_image_url,
          card_image_url: ootdData.card_image_url,
          items: ootdData.items,
          style_summary: ootdData.summary,
          hashtags: ootdData.hashtags,
          is_public: isPublic,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSaved(true);
      sessionStorage.removeItem("ootdData");
      if (data.share_id) setShareId(data.share_id);
      addToast("카드가 저장됐습니다.", "success");
    } catch {
      addToast("저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }, [saving, saved, ootdData, isPublic, addToast]);

  const handleRegen = useCallback(() => {
    setRegenModalOpen(false);
    router.push("/upload");
  }, [router]);

  if (!ootdData) return <CardPreviewSkeleton />;

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      <header className="text-center">
        <h1 className="text-xl font-semibold text-zinc-900">오늘의 카드</h1>
        <p className="mt-1 text-sm text-zinc-500">저장하거나 공유해보세요</p>
      </header>

      <CardPreview imageUrl={ootdData.card_image_url} />

      {/* 공개/비공개 토글 (저장 전에만 표시) */}
      {!saved && (
        <div className="w-full max-w-sm flex items-center justify-between bg-white rounded-2xl border border-zinc-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {isPublic ? "공개로 저장" : "비공개로 저장"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isPublic ? "공유 링크가 생성됩니다" : "나만 볼 수 있어요"}
            </p>
          </div>
          <button
            onClick={() => setIsPublic((v) => !v)}
            aria-label={isPublic ? "비공개로 전환" : "공개로 전환"}
            className={[
              "relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer",
              isPublic ? "bg-zinc-900" : "bg-zinc-300",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                isPublic ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full"
          onClick={handleSave}
          loading={saving}
          disabled={saved}
        >
          {saved ? "저장 완료" : "저장하기"}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={handleDownload}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            PNG 저장
          </Button>

          {saved && shareId ? (
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={handleCopyLink}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                />
              </svg>
              링크 복사
            </Button>
          ) : null}
        </div>

        <Button
          variant="ghost"
          size="md"
          className="w-full text-zinc-500"
          onClick={() => setRegenModalOpen(true)}
        >
          다시 만들기
        </Button>
      </div>

      {/* 다시 만들기 확인 모달 */}
      <Modal
        open={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        title="다시 만들기"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            처음부터 다시 시작하면 새 카드 생성 시 횟수가 차감됩니다.
            <br />
            계속하시겠어요?
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setRegenModalOpen(false)}
            >
              취소
            </Button>
            <Button size="md" className="flex-1" onClick={handleRegen}>
              다시 만들기
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

export default function CardPage() {
  return (
    <Suspense fallback={<CardPreviewSkeleton />}>
      <CardPageInner />
    </Suspense>
  );
}
