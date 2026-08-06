import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { workflowSteps } from "@/db/schema";
import { emitWorkflowChanged } from "@/lib/workflow-events";

type StepAccounting = {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
};

type StepDefinition = {
  key: string;
  title: string;
  description: string;
  position: number;
  kind?: string;
};

export function errorMessage(error: unknown, fallback = "Step failed") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export async function beginApplicationStep(applicationId: string, definition: StepDefinition) {
  const [step] = await getDb()
    .insert(workflowSteps)
    .values({
      applicationId,
      ...definition,
      kind: definition.kind ?? "system",
      status: "running",
      startedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [workflowSteps.applicationId, workflowSteps.key],
      set: { status: "running", error: null, startedAt: new Date(), completedAt: null },
    })
    .returning({ id: workflowSteps.id });
  await emitWorkflowChanged();
  return step.id;
}

export async function beginJobGenerationStep(jobGenerationId: string, definition: StepDefinition) {
  const [step] = await getDb()
    .insert(workflowSteps)
    .values({
      jobGenerationId,
      ...definition,
      kind: definition.kind ?? "system",
      status: "running",
      startedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [workflowSteps.jobGenerationId, workflowSteps.key],
      set: { status: "running", error: null, startedAt: new Date(), completedAt: null },
    })
    .returning({ id: workflowSteps.id });
  await emitWorkflowChanged();
  return step.id;
}

export async function completeWorkflowStep(
  id: string,
  accounting?: StepAccounting,
  metadata?: Record<string, unknown>,
) {
  await getDb()
    .update(workflowSteps)
    .set({
      status: "completed",
      completedAt: new Date(),
      model: accounting?.model,
      inputTokens: accounting?.inputTokens,
      outputTokens: accounting?.outputTokens,
      costUsd: accounting?.costUsd,
      metadata,
    })
    .where(eq(workflowSteps.id, id));
  await emitWorkflowChanged();
}

export async function failWorkflowStep(id: string, error: unknown) {
  await getDb()
    .update(workflowSteps)
    .set({ status: "failed", error: errorMessage(error), completedAt: new Date() })
    .where(eq(workflowSteps.id, id));
  await emitWorkflowChanged();
}
