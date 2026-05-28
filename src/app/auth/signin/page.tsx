"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInContent() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-6 gap-8">
      <div className="flex flex-col items-center gap-2">
        <span className="font-handwriting text-5xl text-zinc-900 select-none">
          OOTD
        </span>
        <p className="text-sm text-zinc-500">오늘의 착장을 기록하세요</p>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="flex items-center justify-center gap-3 w-full h-12 rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google로 로그인
        </button>

        <button
          onClick={() => signIn("kakao", { callbackUrl })}
          className="flex items-center justify-center gap-3 w-full h-12 rounded-full bg-[#FEE500] text-sm font-medium text-[#191919] hover:bg-[#F0D800] transition-colors cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.552 1.483 4.796 3.737 6.18-.165.617-.597 2.237-.684 2.583-.108.43.157.425.33.31.136-.092 2.162-1.47 3.036-2.065A11.29 11.29 0 0012 17.998c5.523 0 10-3.477 10-7.498C22 6.477 17.523 3 12 3z" />
          </svg>
          Kakao로 로그인
        </button>
      </div>

      <p className="text-xs text-zinc-400 text-center max-w-xs leading-relaxed">
        로그인하면 월 5회 무료로 OOTD 카드를 만들 수 있어요.
      </p>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}
