import Link from "next/link";
import Image from "next/image";
import { getAuthSession } from "@/lib/auth";
import WeatherSection from "@/components/home/WeatherSection";

export default async function Home() {
  const session = await getAuthSession();
  const isLoggedIn = !!session?.user;

  return (
    <main className="flex flex-col items-center min-h-screen bg-[#fdf8f8]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 py-20 text-center gap-6 max-w-md mx-auto">
        <div className="font-display text-5xl font-bold tracking-tighter text-[#1c1b1b] leading-tight select-none">
          OOTD
        </div>
        <h1 className="text-[24px] font-semibold text-[#1c1b1b] tracking-tight leading-snug">
          오늘의 착장을
          <br />
          손글씨 카드로 기록하세요
        </h1>
        <p className="text-sm text-[#444748] leading-relaxed">
          사진 한 장이면 충분해요. AI가 착장 아이템을 분석하고
          <br />
          나만의 감성 패션 카드를 만들어드려요.
        </p>

        <Link href="/upload" className="w-full">
          <button className="w-full bg-black text-white rounded-full py-4 text-sm font-semibold uppercase tracking-widest active:scale-[0.98] transition-transform">
            오늘의 착장 기록하기
          </button>
        </Link>

        {!isLoggedIn && (
          <p className="text-xs text-[#747878]">
            무료로 월 5회 · Google·Kakao로 시작하기
          </p>
        )}
      </section>

      {isLoggedIn && (
        <section className="w-full max-w-md px-6 pb-4">
          <WeatherSection />
        </section>
      )}

      {isLoggedIn && (
        <section className="w-full max-w-md px-6 pb-16">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-[#444748] uppercase tracking-widest">
              최근 기록
            </h2>
            <Link
              href="/calendar"
              className="text-xs text-[#747878] hover:text-[#1c1b1b] transition-colors"
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
                <span className="text-xs text-[#444748]">
                  {session.user.name}님의 OOTD
                </span>
              </div>
            )}
            <Link href="/calendar" className="col-span-3">
              <div className="w-full py-3 rounded-[24px] border border-[#f1edec] bg-white text-center text-sm text-[#747878] hover:bg-[#f7f3f2] transition-colors">
                캘린더에서 전체 기록 보기
              </div>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
