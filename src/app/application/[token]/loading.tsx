import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center bg-[#fafaf8] p-5"
      role="status"
      aria-label="Loading application status"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-[0_12px_40px_rgba(15,23,42,.08),0_0_0_1px_rgba(15,23,42,.06)]">
        <Skeleton className="size-8 rounded-[10px]" />
        <div className="mt-8 flex gap-3">
          <Skeleton className="size-6 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="mt-6 h-20 w-full rounded-xl" />
        <span className="sr-only">Loading application status…</span>
      </div>
    </main>
  );
}
