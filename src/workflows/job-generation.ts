import { eq } from "drizzle-orm";
import { AI_MODEL, streamJobSpec } from "@/ai/generate";
import type { JobSpec } from "@/ai/schemas";
import { getDb } from "@/db";
import { auditEvents, jobGenerationRuns, jobs, workflowSteps } from "@/db/schema";
import { renderJob, slugify } from "@/lib/jobs";
import { approveJob, publishJob } from "@/lib/job-lifecycle";
import { getWorkflowMode } from "@/lib/workspace-mode";
import { emitWorkflowChanged } from "@/lib/workflow-events";

type Accounting = { model: string; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };

async function beginStep(
  jobGenerationId: string,
  key: string,
  title: string,
  description: string,
  position: number,
  kind = "system",
) {
  const [step] = await getDb()
    .insert(workflowSteps)
    .values({ jobGenerationId, key, title, description, position, kind, status: "running", startedAt: new Date() })
    .onConflictDoUpdate({
      target: [workflowSteps.jobGenerationId, workflowSteps.key],
      set: { status: "running", error: null, startedAt: new Date(), completedAt: null },
    })
    .returning({ id: workflowSteps.id });
  await emitWorkflowChanged();
  return step.id;
}

async function completeStep(id: string, accounting?: Accounting) {
  await getDb()
    .update(workflowSteps)
    .set({
      status: "completed",
      completedAt: new Date(),
      model: accounting?.model,
      inputTokens: accounting?.inputTokens,
      outputTokens: accounting?.outputTokens,
      costUsd: accounting?.costUsd,
    })
    .where(eq(workflowSteps.id, id));
  await emitWorkflowChanged();
}

async function failStep(id: string, error: unknown) {
  await getDb()
    .update(workflowSteps)
    .set({ status: "failed", error: error instanceof Error ? error.message : "Step failed", completedAt: new Date() })
    .where(eq(workflowSteps.id, id));
  await emitWorkflowChanged();
}

async function generateDraft(jobGenerationId: string, prompt: string) {
  "use step";
  console.info("job-generation:generate", { jobGenerationId });
  const stepId = await beginStep(
    jobGenerationId,
    "generate",
    "Generate job description",
    "AI structures the role, requirements, and responsibilities.",
    0,
    "ai",
  );
  try {
    await getDb()
      .update(jobGenerationRuns)
      .set({ status: "running", updatedAt: new Date(), error: null })
      .where(eq(jobGenerationRuns.id, jobGenerationId));
    const result = streamJobSpec(prompt);
    for await (const draft of result.partialOutputStream) {
      await getDb()
        .update(jobGenerationRuns)
        .set({ draft: draft as Partial<JobSpec>, updatedAt: new Date() })
        .where(eq(jobGenerationRuns.id, jobGenerationId));
      await emitWorkflowChanged();
    }
    const [generated, usage, providerMetadata] = await Promise.all([
      result.output,
      result.totalUsage,
      result.providerMetadata,
    ]);
    const spec = generated as JobSpec;
    const openrouter = providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined;
    const accounting = {
      model: AI_MODEL,
      inputTokens: usage.inputTokens ?? null,
      outputTokens: usage.outputTokens ?? null,
      costUsd: openrouter?.usage?.cost ?? null,
    };
    await getDb()
      .update(jobGenerationRuns)
      .set({ draft: spec, updatedAt: new Date() })
      .where(eq(jobGenerationRuns.id, jobGenerationId));
    await completeStep(stepId, accounting);
    return spec;
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function saveJob(
  jobGenerationId: string,
  prompt: string,
  actor: string,
  spec: Awaited<ReturnType<typeof generateDraft>>,
) {
  "use step";
  console.info("job-generation:save", { jobGenerationId });
  const stepId = await beginStep(
    jobGenerationId,
    "save",
    "Save editable draft",
    "Create the job record and make it ready for review.",
    1,
  );
  try {
    const slug = `${slugify(spec.title)}-${Date.now().toString(36).slice(-5)}`;
    const [job] = await getDb()
      .insert(jobs)
      .values({
        slug,
        title: spec.title,
        sourcePrompt: prompt,
        jobSpec: spec,
        renderedHtml: renderJob(spec),
        createdBy: actor,
        aiModel: AI_MODEL,
      })
      .returning();
    await getDb()
      .insert(auditEvents)
      .values({
        entityType: "job",
        entityId: job.id,
        action: "generated",
        actor,
        metadata: { model: AI_MODEL, jobGenerationId },
      });
    await getDb()
      .update(jobGenerationRuns)
      .set({ status: "awaiting_approval", jobId: job.id, draft: spec, updatedAt: new Date() })
      .where(eq(jobGenerationRuns.id, jobGenerationId));
    await completeStep(stepId);
    await getDb()
      .insert(workflowSteps)
      .values([
        {
          jobGenerationId,
          key: "rubric",
          title: "Generate scoring rubric",
          description: "AI creates weighted evaluation criteria after approval.",
          position: 2,
          kind: "ai",
          status: "pending",
        },
        {
          jobGenerationId,
          key: "publish",
          title: "Publish job",
          description: "Publish the approved role to configured job channels.",
          position: 3,
          status: "pending",
        },
      ])
      .onConflictDoNothing();
    await emitWorkflowChanged();
    return job.id;
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function markFailed(jobGenerationId: string, message: string) {
  "use step";
  console.error("job-generation:failed", { jobGenerationId, message });
  await getDb()
    .update(jobGenerationRuns)
    .set({ status: "failed", error: message, updatedAt: new Date(), completedAt: new Date() })
    .where(eq(jobGenerationRuns.id, jobGenerationId));
  await emitWorkflowChanged();
}

async function readWorkflowMode() {
  "use step";
  return getWorkflowMode();
}

async function autoApprove(jobGenerationId: string, jobId: string, actor: string) {
  "use step";
  const stepId = await beginStep(
    jobGenerationId,
    "rubric",
    "Generate scoring rubric",
    "AI creates weighted evaluation criteria automatically in Agent mode.",
    2,
    "ai",
  );
  try {
    const result = await approveJob(jobId, actor);
    await completeStep(stepId, result.accounting);
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function autoPublish(jobGenerationId: string, jobId: string, actor: string) {
  "use step";
  const stepId = await beginStep(
    jobGenerationId,
    "publish",
    "Publish job",
    "Publish the approved role to configured job channels.",
    3,
  );
  try {
    await publishJob(jobId, actor);
    await completeStep(stepId);
    await getDb()
      .update(jobGenerationRuns)
      .set({ status: "completed", error: null, updatedAt: new Date(), completedAt: new Date() })
      .where(eq(jobGenerationRuns.id, jobGenerationId));
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

export async function jobGenerationWorkflow(jobGenerationId: string, prompt: string, actor: string) {
  "use workflow";
  console.info("job-generation:start", { jobGenerationId });
  try {
    const spec = await generateDraft(jobGenerationId, prompt);
    const jobId = await saveJob(jobGenerationId, prompt, actor, spec);
    if ((await readWorkflowMode()) === "agent") {
      await autoApprove(jobGenerationId, jobId, actor);
      await autoPublish(jobGenerationId, jobId, actor);
    }
    return { jobId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    await markFailed(jobGenerationId, message);
    return { failed: true, error: message };
  }
}
