"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import {
  getSharePollingDelay,
  type ShareItemViewModel,
} from "@/lib/share-item";

export type ShareCardItem = ShareItemViewModel & { id: string };

interface ShareFlipCardProps {
  frontImageUrl: string;
  items: ShareCardItem[];
}

function ShareItemImage({ item }: { item: ShareCardItem }) {
  const [failed, setFailed] = useState(false);

  if (!item.imageUrl || failed) {
    return (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-[#f4f0ef] px-6 text-center">
        <div>
          <span className="material-symbols-rounded text-4xl text-[#aaa3a1]">
            checkroom
          </span>
          <p className="mt-2 text-xs leading-relaxed text-[#747878]">
            공개할 수 있는 개별 이미지가 아직 없어요.
          </p>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={`${item.name} 개별 이미지`}
      className="h-56 w-full rounded-2xl bg-[#f8f6f5] object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export default function ShareFlipCard({
  frontImageUrl,
  items,
}: ShareFlipCardProps) {
  const router = useRouter();
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShareCardItem | null>(null);
  const [pollAttempt, setPollAttempt] = useState(0);
  const [isPageHidden, setIsPageHidden] = useState(
    () => typeof document !== "undefined" && document.hidden,
  );
  const frontButtonRef = useRef<HTMLButtonElement>(null);
  const backHeadingRef = useRef<HTMLHeadingElement>(null);
  const hasFlippedRef = useRef(false);
  const hasPendingImages = items.some((item) => item.imagePending);

  useEffect(() => {
    const updateVisibility = () => setIsPageHidden(document.hidden);
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!hasPendingImages) return;
    const delay = getSharePollingDelay(pollAttempt, isPageHidden);
    if (delay === null) return;
    const timer = window.setTimeout(() => {
      setPollAttempt((attempt) => attempt + 1);
      router.refresh();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [hasPendingImages, isPageHidden, pollAttempt, router]);

  const changeFlip = (next: boolean) => {
    hasFlippedRef.current = true;
    setIsFlipped(next);
  };

  useEffect(() => {
    if (!hasFlippedRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (isFlipped) {
        backHeadingRef.current?.focus();
      } else {
        frontButtonRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isFlipped]);

  return (
    <>
      <div className="w-full [perspective:1200px]">
        <div
          className={`relative w-full overflow-visible rounded-[24px] [aspect-ratio:2/3] [transform-style:preserve-3d] transition-transform duration-700 ease-[cubic-bezier(.2,.75,.2,1)] motion-reduce:transition-none ${
            isFlipped ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <button
            ref={frontButtonRef}
            type="button"
            className={`absolute inset-0 overflow-hidden rounded-[24px] bg-black shadow-2xl [backface-visibility:hidden] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70 ${
              isFlipped ? "pointer-events-none" : "pointer-events-auto"
            }`}
            onClick={() => changeFlip(true)}
            tabIndex={isFlipped ? -1 : 0}
            inert={isFlipped}
            aria-hidden={isFlipped}
            aria-label="카드 뒷면에서 착장 아이템 보기"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frontImageUrl}
              alt="오늘의 OOTD 카드 앞면"
              className="h-full w-full object-contain"
            />
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/75 via-black/25 to-transparent px-4 pb-5 pt-16 text-xs font-semibold tracking-wide text-white">
              <span className="material-symbols-rounded text-base" aria-hidden="true">
                360
              </span>
              눌러서 아이템 보기
            </span>
          </button>

          <section
            className={`absolute inset-0 flex flex-col overflow-hidden rounded-[24px] bg-[#fffdfb] p-5 text-[#1c1b1b] shadow-2xl [backface-visibility:hidden] [transform:rotateY(180deg)] ${
              isFlipped ? "pointer-events-auto" : "pointer-events-none"
            }`}
            aria-hidden={!isFlipped}
            inert={!isFlipped}
          >
            <div className="flex items-start justify-between border-b border-[#ebe5e3] pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a9391]">
                  Outfit Details
                </p>
                <h2
                  ref={backHeadingRef}
                  tabIndex={-1}
                  className="mt-1 text-xl font-semibold focus:outline-none"
                >
                  오늘의 아이템
                </h2>
              </div>
              <span className="rounded-full bg-[#f1edec] px-2.5 py-1 text-xs font-bold text-[#5d5e60]">
                {items.length}
              </span>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {items.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {items.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className="group flex w-full items-center gap-3 rounded-2xl border border-[#eee8e6] bg-white p-3 text-left transition-colors hover:border-[#d8cfcc] hover:bg-[#fdf9f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                      onClick={() => setSelectedItem(item)}
                      tabIndex={isFlipped ? 0 : -1}
                      aria-label={`${item.name} 상세 정보 보기`}
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1c1b1b] text-xs font-bold text-white">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-[#9a9391]">
                          {item.categoryLabel}
                        </span>
                      </span>
                      <span
                        className="text-lg text-[#aaa3a1] transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm leading-relaxed text-[#747878]">
                  이 카드에는 공개된 아이템 정보가 없어요.
                </div>
              )}
            </div>

            <p className="mt-4 text-center text-[10px] tracking-wide text-[#aaa3a1]">
              이름을 누르면 이미지와 상세 정보를 볼 수 있어요
            </p>
          </section>
        </div>

        <button
          type="button"
          onClick={() => changeFlip(!isFlipped)}
          aria-pressed={isFlipped}
          className="mx-auto mt-5 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
        >
          <span className="material-symbols-rounded text-base" aria-hidden="true">
            360
          </span>
          {isFlipped ? "카드 앞면 보기" : "카드 뒤집기"}
        </button>
      </div>

      <Modal
        open={selectedItem !== null}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name}
      >
        {selectedItem && (
          <div className="flex flex-col gap-5">
            <ShareItemImage key={selectedItem.id} item={selectedItem} />

            <div>
              <span className="inline-flex rounded-full bg-[#f1edec] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5d5e60]">
                {selectedItem.categoryLabel}
              </span>
              <dl className="mt-4 divide-y divide-[#eee8e6]">
                {selectedItem.details.map((detail) => (
                  <div
                    key={detail.label}
                    className="grid grid-cols-[72px_1fr] gap-3 py-3 text-sm"
                  >
                    <dt className="text-[#8b8583]">{detail.label}</dt>
                    <dd className="break-words font-medium leading-relaxed text-[#1c1b1b]">
                      {detail.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
