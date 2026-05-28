export default function CardLoading() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      <div className="text-center">
        <div className="h-6 w-24 bg-zinc-200 rounded-lg animate-pulse mx-auto" />
        <div className="h-4 w-40 bg-zinc-100 rounded-lg animate-pulse mx-auto mt-2" />
      </div>
      <div className="w-full max-w-sm aspect-[9/16] rounded-2xl bg-zinc-200 animate-pulse" />
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="h-12 rounded-full bg-zinc-200 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-full bg-zinc-100 animate-pulse" />
          <div className="h-10 flex-1 rounded-full bg-zinc-100 animate-pulse" />
        </div>
      </div>
    </main>
  );
}
