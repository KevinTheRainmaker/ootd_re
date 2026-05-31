import Link from "next/link";
import type { OotdRecord, Mood } from "@/types";

const MOOD_COLORS: Record<Mood, string> = {
  passion: "bg-red-400",
  happy: "bg-yellow-400",
  calm: "bg-blue-400",
  cozy: "bg-green-400",
  creative: "bg-purple-400",
};

interface OotdCardProps {
  record: Pick<
    OotdRecord,
    | "id"
    | "date"
    | "card_image_url"
    | "original_image_url"
    | "hashtags"
    | "mood"
  >;
}

export function OotdCardSkeleton() {
  return <div className="aspect-[3/4] rounded-xl bg-zinc-100 animate-pulse" />;
}

export default function OotdCard({ record }: OotdCardProps) {
  const thumbnail = record.card_image_url ?? record.original_image_url;
  const day = new Date(record.date).getDate();

  return (
    <Link href={`/ootd/${record.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-100 shadow-sm">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={`${record.date} OOTD`}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-zinc-200 flex items-center justify-center">
            <span className="text-zinc-400 text-xs">사진 없음</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <div className="bg-black/50 text-white text-xs font-medium rounded-full px-2 py-0.5">
            {day}일
          </div>
          {record.mood && (
            <div
              className={`w-2 h-2 rounded-full ${MOOD_COLORS[record.mood]}`}
            />
          )}
        </div>
      </div>
    </Link>
  );
}
