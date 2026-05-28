export default function UploadLoading() {
  return (
    <main className="flex flex-col items-center min-h-screen bg-zinc-50 px-4 py-10 gap-8">
      <div className="text-center">
        <div className="h-7 w-36 bg-zinc-200 rounded-lg animate-pulse mx-auto" />
        <div className="h-4 w-48 bg-zinc-100 rounded-lg animate-pulse mx-auto mt-2" />
      </div>
      <div className="w-full max-w-sm aspect-[3/4] rounded-2xl bg-zinc-200 animate-pulse" />
    </main>
  );
}
