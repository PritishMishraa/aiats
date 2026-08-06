import { Suspense } from "react";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  Briefcase,
  CalendarCheck,
  CaretRight,
  Sparkle,
  TrendUp,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db";
import { applications, interviews, jobs } from "@/db/schema";

async function Metrics() {
  const db = getDb();
  const counts = await Promise.all([
    db.$count(jobs, eq(jobs.status, "published")),
    db.$count(applications),
    db.$count(applications, eq(applications.recommendation, "strong_fit")),
    db.$count(interviews),
  ]);
  const metrics = [
    { label: "Open roles", value: counts[0], icon: Briefcase, tone: "bg-indigo-50 text-indigo-600" },
    { label: "Total candidates", value: counts[1], icon: Users, tone: "bg-sky-50 text-sky-600" },
    { label: "Strong matches", value: counts[2], icon: TrendUp, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Interviews", value: counts[3], icon: CalendarCheck, tone: "bg-amber-50 text-amber-600" },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="rounded-xl bg-white p-4 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-2 tabular-nums text-2xl font-semibold">{value}</p>
            </div>
            <span className={`grid size-9 place-items-center rounded-[10px] ${tone}`}>
              <Icon size={17} weight="fill" />
            </span>
          </div>
        </div>
      ))}
    </section>
  );
}

async function ActiveJobs() {
  const jobRows = await getDb()
    .select({
      job: jobs,
      candidates: sql<number>`count(${applications.id})::int`,
      strong: sql<number>`count(${applications.id}) filter (where ${applications.recommendation} = 'strong_fit')::int`,
    })
    .from(jobs)
    .leftJoin(applications, eq(applications.jobId, jobs.id))
    .groupBy(jobs.id)
    .orderBy(desc(jobs.updatedAt))
    .limit(3);
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-semibold">Active jobs</h2>
        <Link href="/admin/jobs" className="flex min-h-10 items-center gap-1 text-xs text-slate-500">
          View all <ArrowRight />
        </Link>
      </div>
      <div className="divide-y divide-slate-100 border-t">
        {jobRows.map(({ job, candidates, strong }) => (
          <Link
            href={`/admin/jobs/${job.id}`}
            key={job.id}
            className="grid min-h-20 grid-cols-[1fr_auto] items-center gap-4 px-5 hover:bg-slate-50 sm:grid-cols-[1fr_100px_100px_24px]"
          >
            <div>
              <div className="flex gap-2">
                <h3 className="text-[13px] font-medium">{job.title}</h3>
                <Badge variant="secondary">{job.status}</Badge>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{job.jobSpec.department}</p>
            </div>
            <p className="hidden text-xs sm:block">{candidates} candidates</p>
            <p className="hidden text-xs text-emerald-700 sm:block">{strong} strong fit</p>
            <CaretRight />
          </Link>
        ))}
        {!jobRows.length ? <p className="p-5 text-xs text-slate-500">No jobs yet.</p> : null}
      </div>
    </section>
  );
}

async function CandidateQueue() {
  const rows = await getDb()
    .select({ application: applications, title: jobs.title })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .orderBy(desc(applications.submittedAt))
    .limit(6);
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-semibold">Candidates to review</h2>
        <Link href="/admin/candidates" className="text-xs text-slate-500">
          View queue
        </Link>
      </div>
      <div className="divide-y border-t">
        {rows.map(({ application, title }) => (
          <Link
            key={application.id}
            href={`/admin/candidates/${application.id}`}
            className="flex min-h-16 items-center justify-between px-5 hover:bg-slate-50"
          >
            <div>
              <p className="text-xs font-medium">{application.candidateName}</p>
              <p className="mt-1 text-[10px] text-slate-400">{title}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold">{application.weightedScore ?? "—"}</p>
              <p className="text-[10px] capitalize text-slate-400">{application.status.replaceAll("_", " ")}</p>
            </div>
          </Link>
        ))}
        {!rows.length ? <p className="p-5 text-xs text-slate-500">New applications will appear here.</p> : null}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-400">Live hiring workspace</p>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">Hiring overview</h1>
          <p className="mt-1 text-sm text-slate-500">Current data from your jobs and candidate pipeline.</p>
        </div>
        <Link href="/admin/jobs/new" className={buttonVariants({ className: "h-10 bg-slate-950 px-4 text-white" })}>
          <Sparkle weight="fill" className="text-lime-300" /> Generate a job
        </Link>
      </section>
      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl bg-white" />
            ))}
          </div>
        }
      >
        <Metrics />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 rounded-xl bg-white" />}>
        <ActiveJobs />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-80 rounded-xl bg-white" />}>
        <CandidateQueue />
      </Suspense>
    </div>
  );
}
