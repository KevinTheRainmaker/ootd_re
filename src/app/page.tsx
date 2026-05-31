import { getAuthSession } from "@/lib/auth";
import WeatherWidget from "@/components/home/WeatherWidget";
import HomeCalendar from "@/components/home/HomeCalendar";
import Link from "next/link";

export default async function Home() {
  const session = await getAuthSession();
  const isLoggedIn = !!session?.user;

  if (!isLoggedIn) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-[#fdf8f8] px-6 gap-8 text-center">
        <div>
          <div className="font-display text-5xl font-bold tracking-tighter text-[#1c1b1b] mb-3">
            OOTD
          </div>
          <p className="text-sm text-[#444748] leading-relaxed">
            오늘의 착장을 AI가 분석하고
            <br />
            손글씨 카드로 기록하세요
          </p>
        </div>
        <Link href="/auth/signin" className="w-full max-w-xs">
          <button className="w-full bg-black text-white rounded-full py-4 text-sm font-semibold uppercase tracking-widest">
            시작하기
          </button>
        </Link>
        <p className="text-xs text-[#747878]">
          무료로 월 5회 · Google로 시작하기
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-[#fdf8f8]">
      {/* 날씨 + AI 추천 섹션 */}
      <section className="px-4 pt-4 pb-2">
        <WeatherWidget />
      </section>

      {/* 캘린더 섹션 */}
      <section className="flex-1 pb-6">
        <HomeCalendar />
      </section>
    </main>
  );
}
