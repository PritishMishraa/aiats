import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobGenerationRuns, workflowSteps } from "@/db/schema";

export type StepAccounting = { model: string; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };

export async function startJobLifecycleStep(jobId: string, key: string, title: string, description: string, position: number, kind = "system") {
  const [generation] = await getDb().select({ id: jobGenerationRuns.id }).from(jobGenerationRuns).where(eq(jobGenerationRuns.jobId, jobId)).limit(1);
  if (!generation) return null;
  const [step] = await getDb().insert(workflowSteps).values({ jobGenerationId: generation.id, key, title, description, position, kind, status: "running", startedAt: new Date() }).onConflictDoUpdate({ target: [workflowSteps.jobGenerationId, workflowSteps.key], set: { status: "running", error: null, startedAt: new Date(), completedAt: null } }).returning({ id: workflowSteps.id });
  await getDb().update(jobGenerationRuns).set({ status: "running", error: null, updatedAt: new Date() }).where(eq(jobGenerationRuns.id, generation.id));
  return { generationId: generation.id, stepId: step.id };
}

export async function completeJobLifecycleStep(tracking: NonNullable<Awaited<ReturnType<typeof startJobLifecycleStep>>>, nextStatus: string, accounting?: StepAccounting) {
  await Promise.all([
    getDb().update(workflowSteps).set({ status: "completed", completedAt: new Date(), model: accounting?.model, inputTokens: accounting?.inputTokens, outputTokens: accounting?.outputTokens, costUsd: accounting?.costUsd }).where(eq(workflowSteps.id, tracking.stepId)),
    getDb().update(jobGenerationRuns).set({ status: nextStatus, error: null, updatedAt: new Date(), completedAt: nextStatus === "completed" ? new Date() : null }).where(eq(jobGenerationRuns.id, tracking.generationId)),
  ]);
}

export async function failJobLifecycleStep(tracking: NonNullable<Awaited<ReturnType<typeof startJobLifecycleStep>>>, error: unknown) {
  const message = error instanceof Error ? error.message : "Step failed";
  await Promise.all([
    getDb().update(workflowSteps).set({ status: "failed", error: message, completedAt: new Date() }).where(eq(workflowSteps.id, tracking.stepId)),
    getDb().update(jobGenerationRuns).set({ status: "failed", error: message, updatedAt: new Date() }).where(eq(jobGenerationRuns.id, tracking.generationId)),
  ]);
}
