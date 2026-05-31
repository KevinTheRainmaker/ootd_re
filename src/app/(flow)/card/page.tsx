"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import CardPreview, {
  CardPreviewSkeleton,
} from "@/components/card/CardPreview";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import type { AnalyzeResponse, CardType } from "@/types/api";
import type { Mood } from "@/types";

interface OotdSessionData {
  items: AnalyzeResponse["items"];
  summary: string;
  hashtags: string[];
  original_image_url: string;
  card_image_url: string;
}

const MOODS = [
  { value: "passion", color: "bg-red-400", label: "열정" },
  { value: "happy", color: "bg-yellow-400", label: "행복" },
  { value: "calm", color: "bg-blue-400", label: "차분" },
  { value: "cozy", color: "bg-green-400", label: "편안" },
  { value: "creative", color: "bg-purple-400", label: "창의" },
] as const;

/** counted: true → 무료 월 5회 / Pro 월 30회 usage 차감 */
const CARD_TYPES: {
  type: CardType;
  label: string;
  icon: string;
  counted: boolean;
}[] = [
  { type: "basic", label: "기본", icon: "photo_library", counted: false },
  { type: "ai", label: "AI 카드", icon: "auto_awesome", counted: true },
  { type: "style", label: "스타일", icon: "palette", counted: true },
];

function CardPageInner() {
  const router = useRouter();
  const { data: session } = useSession();
  const isPro = session?.user?.plan === "pro";

  const [ootdData, setOotdData] = useState<OotdSessionData | null>(null);
  const [cardType, setCardType] = useState<CardType>("basic");
  const [currentCardUrl, setCurrentCardUrl] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [mood, setMood] = useState<Mood>("happy");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{
    current: number;
    limit: number;
  } | null>(null);
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  // 사용량 조회
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) =>
        setUsageInfo({
          current: d.card_generation_count ?? 0,
          limit: d.limit ?? 5,
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ootdData");
      const data = raw ? (JSON.parse(raw) as OotdSessionData) : null;
      setOotdData(data);
      if (data) setCurrentCardUrl(data.card_image_url);
      if (!data) router.replace("/upload");
    } catch {
      router.replace("/upload");
    }
  }, [router]);

  const handleSelectType = useCallback(
    async (type: CardType) => {
      if (type === cardType || generating || !ootdData) return;

      setCardType(type);

      if (type === "basic") {
        setCurrentCardUrl(ootdData.original_image_url);
        return;
      }

      // AI/Style: usage 체크 후 생성
      setGenerating(true);
      try {
        const res = await fetch("/api/ootd/generate-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_type: type,
            ootd_data: {
              original_image_url: ootdData.original_image_url,
              items: ootdData.items,
              summary: ootdData.summary,
              hashtags: ootdData.hashtags,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          if (err.code === "monthly_limit_exceeded") {
            setLimitModalOpen(true);
          } else {
            addToast(err.error ?? "카드 생성에 실패했습니다.", "error");
          }
          setCardType("basic");
          setCurrentCardUrl(ootdData.original_image_url);
          return;
        }
        const { card_image_url } = await res.json();
        setCurrentCardUrl(card_image_url);
        setUsageInfo((prev) =>
          prev ? { ...prev, current: prev.current + 1 } : prev,
        );
      } catch {
        addToast("네트워크 오류가 발생했습니다.", "error");
        setCardType("basic");
        setCurrentCardUrl(ootdData.original_image_url);
      } finally {
        setGenerating(false);
      }
    },
    [cardType, generating, ootdData, addToast],
  );

  const handleDownload = useCallback(async () => {
    if (!currentCardUrl) return;
    try {
      const res = await fetch(currentCardUrl);
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
  }, [currentCardUrl, addToast]);

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

  /** 공유 링크 생성 + Web Share / 클립보드 복사 */
  const handleShare = useCallback(async () => {
    if (!ootdData) return;
    setSharing(true);
    try {
      let sid = shareId;

      if (!sid) {
        if (!saved) {
          const saveRes = await fetch("/api/ootd/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              original_image_url: ootdData.original_image_url,
              card_image_url: currentCardUrl,
              items: ootdData.items,
              style_summary: ootdData.summary,
              hashtags: ootdData.hashtags,
              is_public: true,
              mood,
              date: new Date().toISOString().slice(0, 10),
            }),
          });
          if (!saveRes.ok) {
            addToast("공유 링크 생성에 실패했습니다.", "error");
            return;
          }
          const saveData = await saveRes.json();
          setSaved(true);
          setSavedRecordId(saveData.id ?? null);
          setIsPublic(true);
          sid = saveData.share_id;
          sessionStorage.removeItem("ootdData");
        } else if (savedRecordId) {
          const patchRes = await fetch(`/api/ootd/${savedRecordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_public: true }),
          });
          if (patchRes.ok) {
            const patchData = await patchRes.json();
            sid = patchData.share_id;
            setIsPublic(true);
          }
        }
        if (sid) setShareId(sid);
      }

      if (!sid) {
        addToast("공유 링크를 생성할 수 없습니다.", "error");
        return;
      }

      const shareUrl = `${location.origin}/share/${sid}`;
      if (navigator.share) {
        await navigator.share({
          title: "오늘의 OOTD",
          text: ootdData.summary || "나의 오늘 착장을 확인해보세요!",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        addToast("공유 링크가 복사됐습니다.", "success");
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError")
        addToast("공유에 실패했습니다.", "error");
    } finally {
      setSharing(false);
    }
  }, [ootdData, shareId, saved, savedRecordId, currentCardUrl, mood, addToast]);

  const handleSave = useCallback(async () => {
    if (saving || saved || !ootdData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ootd/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_image_url: ootdData.original_image_url,
          card_image_url: currentCardUrl,
          items: ootdData.items,
          style_summary: ootdData.summary,
          hashtags: ootdData.hashtags,
          is_public: isPublic,
          mood,
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSaved(true);
      setSavedRecordId(data.id ?? null);
      sessionStorage.removeItem("ootdData");
      if (data.share_id) setShareId(data.share_id);
      addToast("캘린더에 저장됐습니다.", "success");
    } catch {
      addToast("저장에 실패했습니다.", "error");
    } finally {
      setSaving(false);
    }
  }, [saving, saved, ootdData, currentCardUrl, isPublic, mood, addToast]);

  if (!ootdData) return <CardPreviewSkeleton />;

  const remaining =
    usageInfo !== null
      ? Math.max(0, usageInfo.limit - usageInfo.current)
      : null;

  return (
    <main className="flex flex-col items-center min-h-screen bg-[#fdf8f8] px-4 pt-6 pb-28 gap-5">
      {/* 헤더 */}
      <header className="w-full max-w-sm text-center">
        <h1
          className="text-2xl font-bold text-[#1c1b1b]"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          OOTD Card
        </h1>
        <p className="mt-1 text-xs text-[#747878] uppercase tracking-widest">
          저장하거나 공유해보세요
        </p>
      </header>

      {/* 카드 미리보기 */}
      <div className="relative w-full max-w-sm">
        {generating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/30 rounded-2xl gap-3">
            <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <p className="text-white text-xs font-medium">카드 생성 중...</p>
          </div>
        )}
        <CardPreview imageUrl={currentCardUrl} />
      </div>

      {/* 카드 스타일 탭 */}
      {!saved && (
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-[#747878] uppercase tracking-widest">
              카드 스타일
            </p>
            {/* 잔여 횟수 뱃지 */}
            {!isPro && remaining !== null && (
              <span
                className={[
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  remaining > 0
                    ? "bg-[#f1edec] text-[#5d5e60]"
                    : "bg-[#ffdad6] text-[#93000a]",
                ].join(" ")}
              >
                {remaining > 0
                  ? `AI 스타일 이번 달 ${remaining}회 남음`
                  : "이번 달 한도 초과"}
              </span>
            )}
            {isPro && (
              <span className="text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                Pro
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {CARD_TYPES.map((ct) => {
              const isSelected = cardType === ct.type;
              const isExhausted =
                ct.counted && !isPro && remaining !== null && remaining <= 0;
              return (
                <button
                  key={ct.type}
                  onClick={() =>
                    isExhausted
                      ? setLimitModalOpen(true)
                      : handleSelectType(ct.type)
                  }
                  disabled={generating}
                  className={[
                    "relative flex flex-col items-center gap-1 p-2.5 rounded-[16px] border transition-all",
                    isSelected
                      ? "border-black bg-black text-white"
                      : isExhausted
                        ? "border-[#e5e2e1] bg-[#fafafa] opacity-50"
                        : "border-[#e5e2e1] bg-white text-[#444748]",
                    generating ? "cursor-not-allowed opacity-50" : "",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "material-symbols-outlined text-[22px]",
                      isSelected ? "text-white" : "text-[#5d5e60]",
                    ].join(" ")}
                  >
                    {ct.icon}
                  </span>
                  <span className="text-[10px] font-semibold leading-tight text-center">
                    {ct.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 공개/비공개 토글 */}
      {!saved && (
        <div className="w-full max-w-sm flex items-center justify-between bg-white rounded-[20px] border border-[#f1edec] px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div>
            <p className="text-sm font-medium text-[#1c1b1b]">
              {isPublic ? "공개로 저장" : "비공개로 저장"}
            </p>
            <p className="text-xs text-[#747878] mt-0.5">
              {isPublic ? "공유 링크가 생성됩니다" : "나만 볼 수 있어요"}
            </p>
          </div>
          <button
            onClick={() => setIsPublic((v) => !v)}
            className={[
              "relative w-11 h-6 rounded-full transition-colors duration-200",
              isPublic ? "bg-black" : "bg-[#c4c7c7]",
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

      {/* 무드 선택 */}
      {!saved && (
        <div className="w-full max-w-sm">
          <p className="text-[10px] font-semibold text-[#747878] uppercase tracking-widest mb-2">
            오늘의 무드
          </p>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                title={m.label}
                className={[
                  "w-9 h-9 rounded-full transition-all",
                  m.color,
                  mood === m.value
                    ? "ring-2 ring-offset-2 ring-[#5d5e60] scale-110"
                    : "opacity-55",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full rounded-full"
          onClick={handleSave}
          loading={saving}
          disabled={saved || generating}
        >
          {saved ? "저장 완료 ✓" : "캘린더에 저장하기"}
        </Button>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1 rounded-full"
            onClick={handleDownload}
            disabled={generating}
          >
            <span className="material-symbols-outlined text-[16px]">
              download
            </span>
            PNG
          </Button>

          <Button
            variant="secondary"
            size="md"
            className="flex-1 rounded-full"
            onClick={handleShare}
            loading={sharing}
            disabled={generating || sharing}
          >
            <span className="material-symbols-outlined text-[16px]">
              ios_share
            </span>
            공유하기
          </Button>
        </div>

        {!saved && (
          <Button
            variant="ghost"
            size="md"
            className="w-full text-[#747878]"
            onClick={() => setRegenModalOpen(true)}
            disabled={generating}
          >
            다시 촬영하기
          </Button>
        )}
      </div>

      {/* 다시 만들기 모달 */}
      <Modal
        open={regenModalOpen}
        onClose={() => setRegenModalOpen(false)}
        title="다시 촬영하기"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#444748] leading-relaxed">
            처음으로 돌아가면 현재 카드가 삭제됩니다. 계속하시겠어요?
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
            <Button
              size="md"
              className="flex-1"
              onClick={() => {
                setRegenModalOpen(false);
                router.push("/upload");
              }}
            >
              확인
            </Button>
          </div>
        </div>
      </Modal>

      {/* 월 한도 초과 모달 */}
      <Modal
        open={limitModalOpen}
        onClose={() => setLimitModalOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="w-14 h-14 bg-[#f1edec] rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px] text-[#5d5e60]">
              hourglass_empty
            </span>
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-bold text-[#1c1b1b] mb-1"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              이번 달 한도 초과
            </h3>
            <p className="text-sm text-[#747878] leading-relaxed">
              무료 플랜은 AI·배경제거·스타일 카드를
              <br />
              <strong className="text-[#1c1b1b]">월 5회</strong>까지 사용할 수
              있어요.
              <br />
              다음 달에 다시 사용하거나 Pro로 업그레이드하세요.
            </p>
          </div>
          <Button
            size="lg"
            className="w-full rounded-full"
            onClick={() => {
              setLimitModalOpen(false);
              router.push("/profile");
            }}
          >
            Pro 플랜 보기 — ₩4,900/월
          </Button>
          <button
            onClick={() => setLimitModalOpen(false)}
            className="text-xs text-[#747878]"
          >
            나중에 (기본 카드 사용)
          </button>
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
