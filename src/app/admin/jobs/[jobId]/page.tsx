import Link from "next/link";
import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, Globe, MapPin, Sparkle, Users } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { JobActions } from "@/components/job-actions";
import { JobDescriptionDownloads } from "@/components/job-description-downloads";
import { JobEditor } from "@/components/job-editor";
import { getDb } from "@/db";
import { applications, jobPostings, jobs } from "@/db/schema";
export default async function JobDetailPage({ params }: PageProps<"/admin/jobs/[jobId]">) {
  const { jobId } = await params;
  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(or(eq(jobs.id, jobId), eq(jobs.slug, jobId)))
    .limit(1);
  if (!job) notFound();
  const [candidates, postings] = await Promise.all([
    getDb().select().from(applications).where(eq(applications.jobId, job.id)),
    getDb().select().from(jobPostings).where(eq(jobPostings.jobId, job.id)),
  ]);
  const spec = job.jobSpec;
  return (
    <div className="space-y-6">
      <Link href="/admin/jobs" className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500">
        <ArrowLeft /> All jobs
      </Link>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge className={job.status === "published" ? "bg-emerald-50 text-emerald-700" : ""}>{job.status}</Badge>
            <span className="text-[11px] text-slate-400">Rubric v{job.rubricVersion}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">{job.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <MapPin /> {[spec.location.city, spec.location.country].filter(Boolean).join(", ") || "Flexible"}
            </span>
            <span className="capitalize">{spec.employmentType.replaceAll("_", " ")}</span>
            <span>{spec.department}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <JobDescriptionDownloads jobId={job.id} />
          {job.status === "published" ? (
            <Link
              href={`/careers/${job.slug}`}
              className={buttonVariants({
                variant: "outline",
                className: "h-10 px-4",
              })}
            >
              <Globe /> Public page
            </Link>
          ) : null}
          <JobEditor jobId={job.id} spec={job.jobSpec} hasRubric={Boolean(job.rubric)} />
          <JobActions jobId={job.id} approved={Boolean(job.rubric)} published={job.status === "published"} />
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <article className="rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.05),0_0_0_1px_rgba(15,23,42,.05)]">
          <h2 className="text-sm font-semibold">About the role</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{spec.summary}</p>
          <h2 className="mt-7 text-sm font-semibold">What you’ll do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {spec.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h2 className="mt-7 text-sm font-semibold">What we’re looking for</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
            {spec.requiredQualifications.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {spec.assumptions.length ? (
            <div className="mt-8 rounded-lg bg-amber-50 p-4">
              <h3 className="text-xs font-semibold text-amber-900">Assumptions to review</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-amber-800">
                {spec.assumptions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
        <aside className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.05),0_0_0_1px_rgba(15,23,42,.05)]">
            <h2 className="text-sm font-semibold">Pipeline</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <Users className="text-sky-600" />
                <p className="mt-3 tabular-nums text-xl font-semibold">{candidates.length}</p>
                <p className="text-[10px] text-slate-400">Candidates</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <CheckCircle className="text-emerald-600" weight="fill" />
                <p className="mt-3 tabular-nums text-xl font-semibold">
                  {candidates.filter((item) => item.recommendation === "strong_fit").length}
                </p>
                <p className="text-[10px] text-slate-400">Strong fit</p>
              </div>
            </div>
          </div>
          {job.rubric ? (
            <div className="rounded-xl bg-violet-50 p-5 text-violet-950">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Sparkle weight="fill" /> Rubric v{job.rubricVersion} approved
              </p>
              <div className="mt-3 space-y-2">
                {job.rubric.criteria.map((criterion) => (
                  <div key={criterion.id} className="flex justify-between text-[11px]">
                    <span>
                      {criterion.name}
                      {criterion.required ? " *" : ""}
                    </span>
                    <b>{criterion.weight}%</b>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 p-5 text-xs text-amber-800">
              Approve this draft to generate its evidence-based scoring rubric.
            </div>
          )}
          {postings.length ? (
            <div className="rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
              <h2 className="text-sm font-semibold">Publishing</h2>
              <div className="mt-3 space-y-3">
                {postings.map((posting) => (
                  <div key={posting.id} className="flex items-center justify-between text-[11px]">
                    <span>
                      {posting.provider}
                      {posting.demo ? " · Demo" : ""}
                    </span>
                    <Badge
                      variant={posting.status === "published" ? "default" : "destructive"}
                      className={posting.status === "published" ? "bg-emerald-50 text-emerald-700" : ""}
                    >
                      {posting.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
