import { Suspense } from "react";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CaretRight, Clock } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getDb } from "@/db";
import { applications, jobs } from "@/db/schema";

function recommendationTone(recommendation: string) {
  switch (recommendation) {
    case "strong_fit":
      return { label: "Strong fit", text: "text-emerald-700", bar: "bg-emerald-500" };
    case "potential_fit":
      return { label: "Potential fit", text: "text-amber-700", bar: "bg-amber-500" };
    case "unfit":
      return { label: "Unfit", text: "text-rose-700", bar: "bg-rose-500" };
    default:
      return { label: recommendation, text: "text-slate-500", bar: "bg-slate-400" };
  }
}

function relativeTime(date: Date) {
  const minutes = Math.max(0, (Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  const days = hours / 24;
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Match({ score, recommendation }: { score: number | null; recommendation: string | null }) {
  if (score == null || recommendation == null) {
    return (
      <div className="w-24 shrink-0 sm:w-28">
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          <Clock weight="fill" /> Pending
        </span>
      </div>
    );
  }
  const tone = recommendationTone(recommendation);
  return (
    <div className="w-24 shrink-0 sm:w-28">
      <p className="flex items-baseline gap-1.5">
        <span className="tabular-nums text-sm font-semibold">{score}</span>
        <span className={`text-[11px] font-medium ${tone.text}`}>{tone.label}</span>
      </p>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

async function CandidateList() {
  const rows = await getDb()
    .select({ application: applications, jobTitle: jobs.title })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .orderBy(desc(applications.submittedAt));
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_0_0_1px_rgba(15,23,42,.05)]">
      {rows.length ? (
        <div className="divide-y divide-slate-100">
          {rows.map(({ application, jobTitle }) => (
            <Link
              key={application.id}
              href={`/admin/candidates/${application.id}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors outline-none hover:bg-slate-50 focus-visible:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{application.candidateName}</p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {jobTitle} · {relativeTime(application.submittedAt)}
                </p>
              </div>
              <Match score={application.weightedScore} recommendation={application.recommendation} />
              <Badge variant="outline" className="hidden capitalize md:inline-flex">
                {application.status.replaceAll("_", " ")}
              </Badge>
              <CaretRight className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center text-sm text-slate-400">No applications have been submitted yet.</div>
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-400">Hiring pipeline</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.03em]">Candidates</h1>
        <p className="mt-1 text-sm text-slate-500">Review evidence-backed AI recommendations before taking action.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl bg-white" />}>
        <CandidateList />
      </Suspense>
    </div>
  );
}
