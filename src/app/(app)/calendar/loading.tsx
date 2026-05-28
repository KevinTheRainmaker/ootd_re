export default function CalendarLoading() {
  return (
    <main className="flex flex-col min-h-screen bg-zinc-50 px-4 py-8 gap-6 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-5 w-28 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="w-9 h-9 rounded-full bg-zinc-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] rounded-xl bg-zinc-200 animate-pulse"
          />
        ))}
      </div>
    </main>
  );
}
