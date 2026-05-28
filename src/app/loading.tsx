import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function GlobalLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <LoadingSpinner size="lg" />
    </div>
  );
}
