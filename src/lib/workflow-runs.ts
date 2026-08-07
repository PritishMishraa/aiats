import { asc, eq, inArray, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, jobGenerationRuns, jobs, workflowSteps } from "@/db/schema";

const activeApplicationStatuses = new Set(["submitted", "extracting", "evaluating"]);

export type WorkflowRunView = Awaited<ReturnType<typeof getWorkflowRuns>>[number];

export async function getWorkflowRuns() {
  const [applicationRows, generationRows] = await Promise.all([
    getDb()
      .select({
        applicationId: applications.id,
        candidateName: applications.candidateName,
        applicationStatus: applications.status,
        failureReason: applications.failureReason,
        runId: applications.workflowRunId,
        submittedAt: applications.submittedAt,
        jobTitle: jobs.title,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(isNotNull(applications.workflowRunId)),
    getDb().select().from(jobGenerationRuns).where(isNotNull(jobGenerationRuns.workflowRunId)),
  ]);
  const applicationIds = applicationRows.map((row) => row.applicationId);
  const generationIds = generationRows.map((row) => row.id);
  const [applicationSteps, generationSteps] = await Promise.all([
    applicationIds.length
      ? getDb()
          .select()
          .from(workflowSteps)
          .where(inArray(workflowSteps.applicationId, applicationIds))
          .orderBy(asc(workflowSteps.position))
      : [],
    generationIds.length
      ? getDb()
          .select()
          .from(workflowSteps)
          .where(inArray(workflowSteps.jobGenerationId, generationIds))
          .orderBy(asc(workflowSteps.position))
      : [],
  ]);
  const serializeSteps = (steps: (typeof workflowSteps.$inferSelect)[]) =>
    steps.map((step) => ({
      ...step,
      startedAt: step.startedAt.toISOString(),
      completedAt: step.completedAt?.toISOString() ?? null,
    }));
  return [
    ...applicationRows.map((row) => {
      const steps = serializeSteps(applicationSteps.filter((step) => step.applicationId === row.applicationId));
      return {
        id: row.applicationId,
        type: "application" as const,
        title: `Evaluate ${row.candidateName}`,
        subtitle: row.jobTitle,
        status: row.applicationStatus,
        failureReason: row.failureReason,
        runId: row.runId!,
        submittedAt: row.submittedAt.toISOString(),
        active: activeApplicationStatuses.has(row.applicationStatus),
        waiting: steps.some((step) => step.status === "pending"),
        detailHref: `/admin/candidates/${row.applicationId}`,
        detailLabel: "View candidate",
        steps,
      };
    }),
    ...generationRows.map((row) => ({
      id: row.id,
      type: "job_generation" as const,
      title: row.draft?.title ? `Create ${row.draft.title}` : "Create job posting",
      subtitle: "AI-generated job description",
      status: row.status,
      failureReason: row.error,
      runId: row.workflowRunId!,
      submittedAt: row.createdAt.toISOString(),
      active: row.status === "queued" || row.status === "running",
      waiting: row.status === "awaiting_approval" || row.status === "awaiting_publish",
      detailHref: row.jobId ? `/admin/jobs/${row.jobId}` : `/admin/jobs/new?generation=${row.id}`,
      detailLabel: row.jobId ? "View job" : "View live draft",
      steps: serializeSteps(generationSteps.filter((step) => step.jobGenerationId === row.id)),
    })),
  ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
