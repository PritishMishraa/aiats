import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightning, MapPin } from "@phosphor-icons/react/dist/ssr";
import { ApplicationForm } from "@/components/application-form";
import { getPublishedJob, getPublishedJobs } from "@/lib/public-jobs";

export async function generateStaticParams() {
  const publishedJobs = await getPublishedJobs();
  return publishedJobs.map((job) => ({ slug: job.slug }));
}

export default async function CareerPage({ params }: PageProps<"/careers/[slug]">) {
  const { slug } = await params;
  const job = await getPublishedJob(slug);
  if (!job) notFound();
  const spec = job.jobSpec;
  const remote = spec.workplaceType === "remote";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.renderedHtml,
    datePosted: job.publishedAt?.toISOString(),
    employmentType: spec.employmentType.toUpperCase(),
    hiringOrganization: { "@type": "Organization", name: "Northstar" },
    jobLocationType: remote ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements:
      remote && spec.location.country ? { "@type": "Country", name: spec.location.country } : undefined,
    jobLocation:
      !remote && (spec.location.city || spec.location.country)
        ? {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: spec.location.city ?? undefined,
              addressCountry: spec.location.country ?? undefined,
            },
          }
        : undefined,
  };
  return (
    <main className="min-h-screen bg-[#fafaf8]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5">
        <Link href="/careers" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white">
            <Lightning weight="fill" />
          </span>{" "}
          Northstar
        </Link>
      </header>
      <article className="mx-auto max-w-5xl px-5 pb-24 pt-12">
        <Link href="/careers" className="inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500">
          <ArrowLeft /> All open roles
        </Link>
        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-violet-600">{spec.department}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">{job.title}</h1>
            <p className="mt-4 flex items-center gap-1 text-sm text-slate-500">
              <MapPin /> {[spec.location.city, spec.location.country].filter(Boolean).join(", ") || "Flexible"} ·{" "}
              {spec.employmentType.replaceAll("_", " ")}
            </p>
            <div className="mt-12 space-y-8 text-sm leading-7 text-slate-600">
              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-950">About the role</h2>
                <p>{spec.summary}</p>
              </section>
              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-950">What you’ll do</h2>
                <ul className="list-disc space-y-2 pl-5">
                  {spec.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h2 className="mb-3 text-lg font-semibold text-slate-950">What we’re looking for</h2>
                <ul className="list-disc space-y-2 pl-5">
                  {spec.requiredQualifications.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
          <aside>
            <div className="sticky top-6">
              <ApplicationForm jobId={job.id} />
            </div>
          </aside>
        </div>
      </article>
    </main>
  );
}
