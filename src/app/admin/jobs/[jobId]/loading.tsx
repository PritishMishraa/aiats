import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading job">
      <Skeleton className="h-10 w-24" />
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <Skeleton className="h-[32rem] rounded-xl bg-white" />
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-xl bg-white" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
