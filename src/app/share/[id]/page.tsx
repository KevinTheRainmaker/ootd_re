import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOotdByShareId } from "@/lib/db/ootd";
import ShareFlipCard from "@/components/share/ShareFlipCard";
import { toShareItemViewModel } from "@/lib/share-item";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getOotdByShareId(id);

  if (!record) return { title: "OOTD를 찾을 수 없습니다" };

  return {
    title: "오늘의 OOTD",
    description: record.style_summary ?? "나의 오늘 착장을 확인해보세요",
    openGraph: {
      title: "오늘의 OOTD",
      description: record.style_summary ?? "나의 오늘 착장을 확인해보세요",
      images: record.card_image_url
        ? [{ url: record.card_image_url, width: 1080, height: 1920 }]
        : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "오늘의 OOTD",
      description: record.style_summary ?? "나의 오늘 착장을 확인해보세요",
      images: record.card_image_url ? [record.card_image_url] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const record = await getOotdByShareId(id);

  if (!record) notFound();

  const items = record.items ?? [];
  const shareItems = items.map((item) => ({
    id: item.id,
    ...toShareItemViewModel(item),
  }));
  const dateStr = record.date
    ? new Date(record.date + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      })
    : null;

  return (
    <main className="min-h-screen bg-[#fdf8f8]">
      {/* 카드 이미지 섹션 */}
      <section className="relative w-full bg-[#1c1b1b] flex items-center justify-center pb-8 pt-12">
        {/* 배경 장식 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1b1b] to-[#2d2d2d]" />

        <div className="relative w-full max-w-xs mx-auto px-4">
          <ShareFlipCard
            frontImageUrl={
              record.card_image_url ?? record.original_image_url
            }
            items={shareItems}
          />

          {/* 날짜 오버레이 */}
          {dateStr && (
            <div className="mt-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
                {dateStr}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 콘텐츠 섹션 */}
      <section className="max-w-sm mx-auto px-4 py-8 flex flex-col gap-6">
        {/* 스타일 요약 */}
        {record.style_summary && (
          <div className="bg-white rounded-[24px] px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#747878] mb-2">
              Style Summary
            </p>
            <p className="text-sm text-[#1c1b1b] leading-relaxed">
              {record.style_summary}
            </p>
          </div>
        )}

        {/* 해시태그 */}
        {record.hashtags && record.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {record.hashtags.map((tag) => (
              <span
                key={tag}
                className="text-xs font-semibold text-[#5d5e60] bg-[#f1edec] rounded-full px-3 py-1"
              >
                {tag.startsWith("#") ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        )}

        {/* 나도 만들기 CTA */}
        <div className="pt-2 pb-8">
          <Link href="/" className="block w-full">
            <button className="w-full bg-black text-white rounded-full py-4 text-sm font-semibold uppercase tracking-widest active:scale-[0.98] transition-transform">
              나도 만들기
            </button>
          </Link>
          <p className="text-center text-xs text-[#747878] mt-3">
            OOTD — 나만의 착장 카드를 만들어보세요
          </p>
        </div>
      </section>
    </main>
  );
}
