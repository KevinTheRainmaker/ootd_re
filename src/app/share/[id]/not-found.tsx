import Link from "next/link";

export default function ShareNotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-4 gap-4 text-center">
      <p className="text-5xl">404</p>
      <h1 className="text-xl font-semibold text-zinc-900">
        OOTD를 찾을 수 없어요
      </h1>
      <p className="text-sm text-zinc-500 leading-relaxed">
        비공개이거나 삭제된 OOTD입니다.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-10 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        홈으로 가기
      </Link>
    </main>
  );
}
