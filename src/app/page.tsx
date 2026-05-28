import Link from "next/link";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { getAuthSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();
  const isLoggedIn = !!session?.user;

  return (
    <main className="flex flex-col items-center min-h-screen bg-white">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center gap-6 max-w-md mx-auto">
        <div className="font-handwriting text-5xl text-zinc-800 leading-tight select-none">
          OOTD
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight leading-snug">
          오늘의 착장을
          <br />
          손글씨 카드로 기록하세요
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          사진 한 장이면 충분해요. AI가 착장 아이템을 분석하고
          <br />
          나만의 감성 패션 카드를 만들어드려요.
        </p>

        <Link href="/upload" className="w-full">
          <Button size="lg" className="w-full">
            오늘의 착장 기록하기
          </Button>
        </Link>

        {!isLoggedIn && (
          <p className="text-xs text-zinc-400">
            무료로 월 5회 · Google·Kakao로 시작하기
          </p>
        )}
      </section>

      {isLoggedIn && (
        <section className="w-full max-w-md px-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-zinc-700">최근 기록</h2>
            <Link
              href="/calendar"
              className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              전체 보기
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {session.user.image && (
              <div className="col-span-3 flex items-center gap-2 mb-2">
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "프로필"}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="text-xs text-zinc-500">
                  {session.user.name}님의 OOTD
                </span>
              </div>
            )}
            <Link href="/calendar" className="col-span-3">
              <div className="w-full py-3 rounded-xl border border-zinc-100 bg-zinc-50 text-center text-sm text-zinc-400 hover:bg-zinc-100 transition-colors">
                캘린더에서 전체 기록 보기
              </div>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
