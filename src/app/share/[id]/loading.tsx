export default function ShareLoading() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-6">
      <div className="w-full max-w-sm aspect-[9/16] rounded-2xl bg-zinc-200 animate-pulse" />
      <div className="w-full max-w-sm flex flex-col gap-2">
        <div className="h-4 w-full bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-4 w-3/4 bg-zinc-100 rounded-lg animate-pulse" />
      </div>
      <div className="w-full max-w-sm flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-16 rounded-full bg-zinc-100 animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}
