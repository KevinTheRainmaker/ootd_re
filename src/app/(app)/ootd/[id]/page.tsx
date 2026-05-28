"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import ItemBadge from "@/components/ootd/ItemBadge";
import type { OotdRecord } from "@/types";

type Tab = "original" | "card";

function OotdDetailInner() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [record, setRecord] = useState<OotdRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("card");
  const [toggling, setToggling] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/ootd/${id}`);
        if (res.status === 404) {
          router.replace("/");
          return;
        }
        if (!res.ok) {
          addToast("불러오기에 실패했습니다.", "error");
          return;
        }
        const data: OotdRecord = await res.json();
        setRecord(data);
      } catch {
        addToast("네트워크 오류가 발생했습니다.", "error");
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const handleTogglePublic = useCallback(async () => {
    if (!record || toggling) return;
    setToggling(true);

    try {
      const res = await fetch(`/api/ootd/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_public: !record.is_public }),
      });

      if (!res.ok) {
        addToast("설정 변경에 실패했습니다.", "error");
        return;
      }

      const updated: OotdRecord = await res.json();
      setRecord(updated);
      addToast(
        updated.is_public ? "공개로 전환됐습니다." : "비공개로 전환됐습니다.",
        "success",
      );
    } catch {
      addToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setToggling(false);
    }
  }, [record, toggling, id, addToast]);

  const handleCopyLink = useCallback(async () => {
    if (!record?.share_id) return;
    const url = `${location.origin}/share/${record.share_id}`;
    try {
      await navigator.clipboard.writeText(url);
      addToast("링크가 복사됐습니다.", "success");
    } catch {
      addToast("링크 복사에 실패했습니다.", "error");
    }
  }, [record, addToast]);

  const handleDelete = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/ootd/${id}`, { method: "DELETE" });
      if (!res.ok) {
        addToast("삭제에 실패했습니다.", "error");
        return;
      }
      router.push("/calendar");
    } catch {
      addToast("네트워크 오류가 발생했습니다.", "error");
    } finally {
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }, [deleting, id, router, addToast]);

  if (loading) {
    return (
      <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10">
        <div className="w-10 h-10 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin mt-16" />
      </main>
    );
  }

  if (!record) return null;

  const items = record.items ?? [];
  const shareUrl = record.share_id
    ? `${typeof window !== "undefined" ? location.origin : ""}/share/${record.share_id}`
    : null;

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      <header className="w-full max-w-sm flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          aria-label="뒤로 가기"
        >
          ← 뒤로
        </button>
        <h1 className="text-lg font-semibold text-zinc-900">
          {record.date.replaceAll("-", ".")}
        </h1>
        <div className="w-10" />
      </header>

      {/* 탭 */}
      <div className="w-full max-w-sm flex bg-zinc-100 rounded-full p-1">
        <button
          onClick={() => setTab("card")}
          className={[
            "flex-1 h-8 rounded-full text-sm font-medium transition-colors",
            tab === "card"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500",
          ].join(" ")}
        >
          카드
        </button>
        <button
          onClick={() => setTab("original")}
          className={[
            "flex-1 h-8 rounded-full text-sm font-medium transition-colors",
            tab === "original"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500",
          ].join(" ")}
        >
          원본
        </button>
      </div>

      {/* 이미지 */}
      <div className="w-full max-w-sm">
        {tab === "card" && record.card_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={record.card_image_url}
            alt="OOTD 카드"
            className="w-full rounded-2xl shadow-md"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={record.original_image_url}
            alt="원본 착장 사진"
            className="w-full rounded-2xl object-cover max-h-96"
          />
        )}
      </div>

      {/* 스타일 요약 */}
      {record.style_summary && (
        <section className="w-full max-w-sm">
          <p className="text-base text-zinc-800 leading-relaxed bg-white rounded-2xl border border-zinc-200 px-4 py-3">
            {record.style_summary}
          </p>
          {record.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {record.hashtags.map((tag) => (
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
      )}

      {/* 아이템 리스트 */}
      {items.length > 0 && (
        <section className="w-full max-w-sm flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
            아이템 ({items.length})
          </h2>
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col gap-2"
            >
              <ItemBadge item={item} size="sm" />
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
            </div>
          ))}
        </section>
      )}

      {/* 공개/비공개 토글 */}
      <section className="w-full max-w-sm flex flex-col gap-3">
        <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {record.is_public ? "공개" : "비공개"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {record.is_public
                ? "링크를 아는 누구나 볼 수 있어요"
                : "나만 볼 수 있어요"}
            </p>
          </div>
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            aria-label={record.is_public ? "비공개로 전환" : "공개로 전환"}
            className={[
              "relative w-11 h-6 rounded-full transition-colors duration-200",
              record.is_public ? "bg-zinc-900" : "bg-zinc-300",
              toggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
          >
            <span
              className={[
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200",
                record.is_public ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
        </div>

        {/* 공개 상태일 때 링크 표시 */}
        {record.is_public && shareUrl && (
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-zinc-200 px-4 py-3">
            <p className="text-xs text-zinc-500 flex-1 truncate">{shareUrl}</p>
            <button
              onClick={handleCopyLink}
              className="shrink-0 text-xs font-medium text-zinc-900 hover:text-zinc-600 transition-colors"
            >
              복사
            </button>
          </div>
        )}
      </section>

      {/* 삭제 버튼 */}
      <section className="w-full max-w-sm pb-6">
        <Button
          variant="ghost"
          size="md"
          className="w-full text-red-500 hover:bg-red-50"
          onClick={() => setDeleteModalOpen(true)}
        >
          삭제하기
        </Button>
      </section>

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="OOTD 삭제"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-600 leading-relaxed">
            삭제하면 카드와 사진이 모두 사라져요.
            <br />
            정말 삭제하시겠어요?
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setDeleteModalOpen(false)}
            >
              취소
            </Button>
            <Button
              size="md"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              loading={deleting}
            >
              삭제
            </Button>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}

export default function OotdDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10">
          <div className="w-10 h-10 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin mt-16" />
        </main>
      }
    >
      <OotdDetailInner />
    </Suspense>
  );
}
