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

const CARD_TYPES: {
  type: CardType;
  label: string;
  icon: string;
  desc: string;
  pro: boolean;
}[] = [
  {
    type: "basic",
    label: "기본",
    icon: "photo_library",
    desc: "원본 사진 + 아이템 정보",
    pro: false,
  },
  {
    type: "ai",
    label: "AI 카드",
    icon: "auto_awesome",
    desc: "AI가 손글씨 주석 생성",
    pro: true,
  },
  {
    type: "remove-bg",
    label: "배경 제거",
    icon: "hide_image",
    desc: "배경 제거 후 새 배경",
    pro: false,
  },
  {
    type: "style",
    label: "스타일",
    icon: "palette",
    desc: "스타일 필터 적용",
    pro: true,
  },
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
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [proModalOpen, setProModalOpen] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

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
      const typeDef = CARD_TYPES.find((t) => t.type === type);
      if (typeDef?.pro && !isPro) {
        setProModalOpen(true);
        return;
      }
      if (type === cardType) return;
      if (!ootdData) return;

      setCardType(type);
      if (type === "basic") {
        setCurrentCardUrl(ootdData.original_image_url);
        return;
      }

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
          addToast(err.error ?? "카드 생성에 실패했습니다.", "error");
          setCardType("basic");
          setCurrentCardUrl(ootdData.original_image_url);
          return;
        }
        const { card_image_url } = await res.json();
        setCurrentCardUrl(card_image_url);
      } catch {
        addToast("네트워크 오류가 발생했습니다.", "error");
        setCardType("basic");
        setCurrentCardUrl(ootdData.original_image_url);
      } finally {
        setGenerating(false);
      }
    },
    [cardType, ootdData, isPro, addToast],
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
          // 아직 저장 안 됨 → 공개로 저장
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
          // 저장됐지만 비공개 → 공개 전환
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
      if (e instanceof Error && e.name !== "AbortError") {
        addToast("공유에 실패했습니다.", "error");
      }
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
            <p className="text-white text-xs font-medium">AI 카드 생성 중...</p>
          </div>
        )}
        <CardPreview imageUrl={currentCardUrl} />
      </div>

      {/* 카드 스타일 탭 */}
      {!saved && (
        <div className="w-full max-w-sm">
          <p className="text-[10px] font-semibold text-[#747878] uppercase tracking-widest mb-2">
            카드 스타일
          </p>
          <div className="grid grid-cols-4 gap-2">
            {CARD_TYPES.map((ct) => {
              const isSelected = cardType === ct.type;
              const locked = ct.pro && !isPro;
              return (
                <button
                  key={ct.type}
                  onClick={() => handleSelectType(ct.type)}
                  disabled={generating}
                  className={[
                    "relative flex flex-col items-center gap-1 p-2.5 rounded-[16px] border transition-all",
                    isSelected
                      ? "border-black bg-black text-white"
                      : "border-[#e5e2e1] bg-white text-[#444748]",
                    generating ? "opacity-50 cursor-not-allowed" : "",
                  ].join(" ")}
                >
                  {locked && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#1c1b1b] rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[10px]">
                        lock
                      </span>
                    </span>
                  )}
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

      {/* Pro 업그레이드 모달 */}
      <Modal
        open={proModalOpen}
        onClose={() => setProModalOpen(false)}
        title=""
      >
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="w-14 h-14 bg-black rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[28px]">
              auto_awesome
            </span>
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-bold text-[#1c1b1b] mb-1"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Pro 기능
            </h3>
            <p className="text-sm text-[#747878] leading-relaxed">
              AI 카드 생성, 배경 제거, 스타일 변경은
              <br />
              Pro 구독자에게만 제공됩니다.
            </p>
          </div>
          <ul className="w-full space-y-2">
            {["AI 손글씨 카드 생성", "배경 제거 및 교체", "스타일 필터"].map(
              (f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-[#444748]"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#66BB6A]">
                    check_circle
                  </span>
                  {f}
                </li>
              ),
            )}
          </ul>
          <Button
            size="lg"
            className="w-full rounded-full"
            onClick={() => {
              setProModalOpen(false);
              router.push("/profile");
            }}
          >
            Pro 플랜 보기 — ₩4,900/월
          </Button>
          <button
            onClick={() => setProModalOpen(false)}
            className="text-xs text-[#747878]"
          >
            나중에
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
