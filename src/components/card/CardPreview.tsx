"use client";

import Image from "next/image";

interface CardPreviewProps {
  imageUrl: string | null;
  alt?: string;
}

export function CardPreviewSkeleton() {
  return (
    <div className="w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl bg-zinc-100 animate-pulse" />
  );
}

export default function CardPreview({
  imageUrl,
  alt = "OOTD 카드",
}: CardPreviewProps) {
  if (!imageUrl) return <CardPreviewSkeleton />;

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[9/16] rounded-2xl overflow-hidden shadow-lg bg-zinc-100">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        className="object-cover"
        draggable={false}
        priority
      />
    </div>
  );
}
