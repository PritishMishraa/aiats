import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading candidate">
      <Skeleton className="h-10 w-32" />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
        <Skeleton className="h-[34rem] rounded-xl bg-white" />
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl bg-white" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl bg-white" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
