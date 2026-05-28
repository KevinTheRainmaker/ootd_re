export default function OotdDetailLoading() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6 max-w-md mx-auto w-full">
      <div className="w-full aspect-[9/16] rounded-2xl bg-zinc-200 animate-pulse" />
      <div className="w-full flex flex-col gap-3">
        <div className="h-4 w-3/4 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-4 w-1/2 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
    </main>
  );
}
