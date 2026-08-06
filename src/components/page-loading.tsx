import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ compact = false }: { compact?: boolean }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
        {Array.from({ length: compact ? 3 : 4 }).map((_, index) => (
          <div key={index} className="rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            {!compact ? <Skeleton className="mt-5 h-20 w-full" /> : null}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
