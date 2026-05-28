"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-6 gap-6 text-center">
          <span className="text-4xl select-none">:(</span>
          <div className="flex flex-col gap-2">
            <h1 className="text-lg font-semibold text-zinc-900">
              오류가 발생했습니다
            </h1>
            <p className="text-sm text-zinc-500 max-w-xs">
              일시적인 문제가 생겼어요. 잠시 후 다시 시도해주세요.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button size="md" className="w-full" onClick={reset}>
              다시 시도
            </Button>
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => (location.href = "/")}
            >
              홈으로
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
