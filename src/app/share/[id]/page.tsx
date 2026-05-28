import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOotdByShareId } from "@/lib/db/ootd";
import ItemBadge from "@/components/ootd/ItemBadge";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getOotdByShareId(id);

  if (!record) {
    return { title: "OOTD를 찾을 수 없습니다" };
  }

  return {
    title: "오늘의 착장",
    description: record.style_summary ?? "OOTD 카드를 확인해보세요",
    openGraph: {
      title: "오늘의 착장",
      description: record.style_summary ?? "OOTD 카드를 확인해보세요",
      images: record.card_image_url
        ? [{ url: record.card_image_url, width: 1080, height: 1920 }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: "오늘의 착장",
      description: record.style_summary ?? "OOTD 카드를 확인해보세요",
      images: record.card_image_url ? [record.card_image_url] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const record = await getOotdByShareId(id);

  if (!record) notFound();

  const items = record.items ?? [];

  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      {/* 카드 이미지 */}
      {record.card_image_url && (
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={record.card_image_url}
            alt="OOTD 카드"
            className="w-full rounded-2xl shadow-md"
          />
        </div>
      )}

      {/* 스타일 요약 */}
      {record.style_summary && (
        <section className="w-full max-w-sm">
          <p className="text-base text-zinc-800 leading-relaxed bg-white rounded-2xl border border-zinc-200 px-4 py-3">
            {record.style_summary}
          </p>
        </section>
      )}

      {/* 해시태그 */}
      {record.hashtags.length > 0 && (
        <section className="w-full max-w-sm flex flex-wrap gap-1.5">
          {record.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-xs text-zinc-500 bg-zinc-100 rounded-full px-2.5 py-1"
            >
              {tag.startsWith("#") ? tag : `#${tag}`}
            </span>
          ))}
        </section>
      )}

      {/* 아이템 리스트 */}
      {items.length > 0 && (
        <section className="w-full max-w-sm flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
            착장 아이템
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

      {/* 나도 만들기 CTA */}
      <section className="w-full max-w-sm pt-2 pb-6">
        <Link
          href="/"
          className="block w-full h-12 rounded-full bg-zinc-900 text-white text-base font-medium flex items-center justify-center hover:bg-zinc-700 transition-colors"
        >
          나도 만들기
        </Link>
      </section>
    </main>
  );
}
