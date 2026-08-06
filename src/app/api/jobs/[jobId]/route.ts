import { eq } from "drizzle-orm";
import { jobSpecSchema } from "@/ai/schemas";
import { getDb } from "@/db";
import { auditEvents, jobs } from "@/db/schema";
import { renderJob } from "@/lib/jobs";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";
import { revalidateTag } from "next/cache";

export async function PATCH(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const actor = "system";
    const { jobId } = await params;
    const [existing] = await getDb().select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!existing) return Response.json({ error: "Job not found" }, { status: 404 });
    const body = await request.json();
    const spec = jobSpecSchema.parse({
      ...existing.jobSpec,
      ...body,
      location: { ...existing.jobSpec.location, ...body.location },
      experience: { ...existing.jobSpec.experience, ...body.experience },
    });
    const [job] = await getDb()
      .update(jobs)
      .set({
        title: spec.title,
        jobSpec: spec,
        renderedHtml: renderJob(spec),
        rubric: null,
        rubricVersion: 0,
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();
    await getDb()
      .insert(auditEvents)
      .values({
        entityType: "job",
        entityId: jobId,
        action: "edited",
        actor,
        metadata: { rubricInvalidated: Boolean(existing.rubric) },
      });
    revalidateTag(PUBLIC_JOBS_CACHE_TAG, { expire: 0 });
    return Response.json({ job });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Update failed" }, { status: 400 });
  }
}
