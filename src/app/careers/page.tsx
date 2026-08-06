import Link from "next/link";
import { ArrowRight, Lightning, MapPin } from "@phosphor-icons/react/dist/ssr";
import { getPublishedJobs } from "@/lib/public-jobs";
export default async function CareersPage() {
  const openJobs = await getPublishedJobs();
  return (
    <main className="min-h-screen bg-[#fafaf8]">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5">
        <Link href="/careers" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white">
            <Lightning weight="fill" />
          </span>{" "}
          Northstar
        </Link>
        <Link href="/admin" className="text-xs font-medium text-slate-500">
          Hiring team
        </Link>
      </header>
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-violet-600">Careers at Northstar</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
            Do the best work of your career.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-500">
            Join a small, thoughtful team building tools that help ambitious companies hire with more clarity and less
            busywork.
          </p>
        </div>
        <div className="mt-20 border-t border-slate-200">
          <div className="flex items-center justify-between py-6">
            <h2 className="text-lg font-semibold">Open roles</h2>
            <span className="text-xs text-slate-400">{openJobs.length} positions</span>
          </div>
          <div className="space-y-3">
            {openJobs.map((job) => (
              <Link
                href={`/careers/${job.slug}`}
                prefetch
                key={job.id}
                className="group flex min-h-24 items-center justify-between rounded-xl bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,.04),0_0_0_1px_rgba(15,23,42,.06)]"
              >
                <div>
                  <h3 className="text-sm font-semibold">{job.title}</h3>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <MapPin />{" "}
                    {[job.jobSpec.location.city, job.jobSpec.location.country].filter(Boolean).join(", ") || "Flexible"}{" "}
                    · {job.jobSpec.workplaceType}
                  </p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-slate-100">
                  <ArrowRight />
                </span>
              </Link>
            ))}
            {!openJobs.length ? (
              <p className="py-12 text-sm text-slate-400">There are no open roles right now. Please check back soon.</p>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
