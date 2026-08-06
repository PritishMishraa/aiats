import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, UserCircle, Warning } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { CandidateActions } from "@/components/candidate-actions";
import { getDb } from "@/db";
import { applications, interviews, jobs, workspaceSettings } from "@/db/schema";
import { companyCalendar } from "@/lib/cal";
export default async function CandidatePage({ params }: PageProps<"/admin/candidates/[applicationId]">) {
  const { applicationId } = await params;
  const [[row], [settings]] = await Promise.all([
    getDb()
      .select({ application: applications, job: jobs, interview: interviews })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(interviews, eq(interviews.applicationId, applications.id))
      .where(eq(applications.id, applicationId))
      .limit(1),
    getDb()
      .select({ techLeadEmail: workspaceSettings.techLeadEmail })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.id, "default"))
      .limit(1),
  ]);
  if (!row) notFound();
  const { application, job, interview } = row;
  const weights = new Map(job.rubric?.criteria.map((item) => [item.id, item]) ?? []);
  return (
    <div className="space-y-6">
      <Link
        href="/admin/candidates"
        className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500"
      >
        <ArrowLeft /> Candidate queue
      </Link>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{application.status.replaceAll("_", " ")}</Badge>
            {application.needsHumanReview ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-700">
                <Warning weight="fill" /> Human review required
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-semibold">{application.candidateName}</h1>
          <p className="mt-1 break-words text-sm text-slate-500">
            {job.title} · {application.candidateEmail}
          </p>
        </div>
        <div className="xl:w-auto xl:justify-end">
          <CandidateActions
            applicationId={application.id}
            resumeHref={`/api/resumes/${application.id}`}
            scheduled={interview?.status === "scheduled"}
            techLeadEmail={settings?.techLeadEmail ?? null}
          />
        </div>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.65fr)]">
        <section className="min-w-0 rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold">AI recommendation</h2>
              <p className="mt-1 text-xs capitalize text-slate-500">
                {application.recommendation?.replaceAll("_", " ") ?? "Evaluation pending"}
              </p>
            </div>
            <p className="tabular-nums text-3xl font-semibold">
              {application.weightedScore ?? "—"}
              <span className="text-xs font-normal text-slate-400"> / 100</span>
            </p>
          </div>
          <div className="mt-6 space-y-3">
            {application.evaluation?.criteria.map((result) => {
              const criterion = weights.get(result.criterionId);
              return (
                <div key={result.criterionId} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs font-semibold">{criterion?.name ?? result.criterionId}</p>
                      <p className="mt-1 text-[10px] capitalize text-slate-400">
                        {result.confidence} confidence · {criterion?.weight ?? 0}% weight
                      </p>
                    </div>
                    <p className="tabular-nums text-sm font-semibold">{result.score} / 5</p>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-slate-600">{result.reasoning}</p>
                  {result.evidence.length ? (
                    <div className="mt-3 space-y-1">
                      {result.evidence.map((evidence) => (
                        <p key={evidence} className="text-[10px] italic text-slate-500">
                          “{evidence}”
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] text-amber-700">No evidence found in resume</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        <aside className="min-w-0 space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
            <h2 className="text-sm font-semibold">Assessment summary</h2>
            <p className="mt-3 text-xs leading-6 text-slate-600">
              {application.evaluation?.summary ?? application.failureReason ?? "Processing is still underway."}
            </p>
          </div>
          {application.evaluation?.missingEvidence.length ? (
            <div className="rounded-xl bg-amber-50 p-5">
              <h2 className="text-xs font-semibold text-amber-900">Missing evidence</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-800">
                {application.evaluation.missingEvidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-xl bg-white p-4 shadow-[0_0_0_1px_rgba(15,23,42,.05),0_8px_24px_rgba(15,23,42,.03)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <UserCircle size={20} weight="fill" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Interview host</p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
                    {settings?.techLeadEmail ?? "Not configured"}
                  </p>
                </div>
              </div>
              <span
                className={
                  settings?.techLeadEmail
                    ? "inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-emerald-700"
                    : "inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-amber-700"
                }
              >
                <CheckCircle weight="fill" /> {settings?.techLeadEmail ? "Ready" : "Needs setup"}
              </span>
            </div>
            <a
              href={companyCalendar.calendarUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex text-[11px] font-semibold text-slate-600 underline underline-offset-3 hover:text-slate-950"
            >
              View Cal.com availability
            </a>
          </div>
          {interview?.startAt ? (
            <div className="rounded-xl bg-emerald-50 p-4 text-xs text-emerald-900">
              <p className="font-semibold">Interview scheduled</p>
              <p className="mt-1">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: companyCalendar.timeZone,
                }).format(interview.startAt)}{" "}
                · 30 minutes
              </p>
              {interview.meetingUrl ? (
                <a
                  href={interview.meetingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex font-semibold underline underline-offset-2"
                >
                  Open meeting
                </a>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
