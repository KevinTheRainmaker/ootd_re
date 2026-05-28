import Link from "next/link";
import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 px-6 gap-6 text-center">
      <span className="font-handwriting text-6xl text-zinc-300 select-none">
        404
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-zinc-900">
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-sm text-zinc-500 max-w-xs">
          주소가 잘못됐거나 삭제된 페이지예요.
        </p>
      </div>
      <Link href="/" className="w-full max-w-xs">
        <Button size="md" className="w-full">
          홈으로
        </Button>
      </Link>
    </main>
  );
}
