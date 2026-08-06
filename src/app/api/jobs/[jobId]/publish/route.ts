import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, jobPostings, jobs } from "@/db/schema";
import {
  publishDemo,
  publishGoogle,
  publishInternal,
  publishLever,
} from "@/integrations/job-boards";
import { requireAdmin } from "@/security/admin";
export async function POST(
  _: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { jobId } = await params;
    const [job] = await getDb()
      .select()
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);
    if (!job?.rubric)
      return Response.json(
        { error: "Approve the job and rubric before publishing." },
        { status: 409 },
      );
    const results = await Promise.all([
      publishInternal(job),
      publishGoogle(job),
      publishDemo("LinkedIn", job),
      publishDemo("Indeed", job),
      publishLever({ id: job.id, spec: job.jobSpec }),
    ]);
    for (const result of results)
      await getDb()
        .insert(jobPostings)
        .values({
          jobId,
          provider: result.provider,
          status: result.status,
          externalId: result.externalId,
          externalUrl: result.externalUrl,
          demo: result.demo,
          error: result.error,
          publishedAt: result.status === "published" ? new Date() : null,
        })
        .onConflictDoUpdate({
          target: [jobPostings.jobId, jobPostings.provider],
          set: {
            status: result.status,
            externalId: result.externalId,
            externalUrl: result.externalUrl,
            demo: result.demo,
            error: result.error,
            publishedAt: result.status === "published" ? new Date() : null,
          },
        });
    await getDb()
      .update(jobs)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
    await getDb()
      .insert(auditEvents)
      .values({
        entityType: "job",
        entityId: jobId,
        action: "published",
        actor,
        metadata: { results },
      });
    return Response.json({ results });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Publishing failed" },
      { status: 500 },
    );
  }
}
