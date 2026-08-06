import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-7" role="status" aria-label="Loading job creator">
      <div className="space-y-3">
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <Skeleton className="h-[28rem] rounded-2xl bg-white" />
        <Skeleton className="h-[36rem] rounded-2xl bg-white" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
