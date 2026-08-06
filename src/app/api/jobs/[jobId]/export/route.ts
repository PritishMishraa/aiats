import { eq, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { jobDescriptionMarkdown } from "@/lib/job-description-export";

function filename(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "job-description"
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const [job] = await getDb()
    .select()
    .from(jobs)
    .where(or(eq(jobs.id, jobId), eq(jobs.slug, jobId)))
    .limit(1);
  if (!job) notFound();

  const name = filename(job.title);
  return new Response(jobDescriptionMarkdown(job.jobSpec), {
    headers: {
      "content-disposition": `attachment; filename="${name}.md"`,
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}
