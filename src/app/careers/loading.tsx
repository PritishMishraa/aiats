import { PageLoading } from "@/components/page-loading";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[#fafaf8] px-5 py-20">
      <div className="mx-auto max-w-6xl">
        <PageLoading compact />
      </div>
    </main>
  );
}
