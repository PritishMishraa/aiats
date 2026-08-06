import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { AI_MODEL, generateRubricWithAccounting } from "@/ai/generate";
import { getDb } from "@/db";
import { auditEvents, jobPostings, jobs } from "@/db/schema";
import { publishDemo, publishGoogle, publishInternal } from "@/integrations/job-boards";
import { PUBLIC_JOBS_CACHE_TAG } from "@/lib/public-jobs";

export async function approveJob(jobId: string, actor = "system") {
  const [job] = await getDb().select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job not found");

  const generated = await generateRubricWithAccounting(job.jobSpec);
  const [updated] = await getDb()
    .update(jobs)
    .set({
      rubric: generated.output,
      rubricVersion: job.rubricVersion + 1,
      status: "approved",
      aiModel: AI_MODEL,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId))
    .returning();
  await getDb()
    .insert(auditEvents)
    .values({
      entityType: "job",
      entityId: job.id,
      action: "approved",
      actor,
      metadata: {
        rubricVersion: updated.rubricVersion,
        aiCostUsd: generated.accounting.costUsd,
        inputTokens: generated.accounting.inputTokens,
        outputTokens: generated.accounting.outputTokens,
        model: generated.accounting.model,
      },
    });
  return { job: updated, accounting: generated.accounting };
}

export async function publishJob(jobId: string, actor = "system") {
  const [job] = await getDb().select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job?.rubric) throw new Error("Approve the job and rubric before publishing.");

  const results = await Promise.all([
    publishInternal(job),
    publishGoogle(job),
    publishDemo("LinkedIn", job),
    publishDemo("Indeed", job),
  ]);
  for (const result of results) {
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
  }
  await getDb()
    .update(jobs)
    .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
  await getDb()
    .insert(auditEvents)
    .values({ entityType: "job", entityId: jobId, action: "published", actor, metadata: { results } });
  revalidateTag(PUBLIC_JOBS_CACHE_TAG, { expire: 0 });
  return results;
}
