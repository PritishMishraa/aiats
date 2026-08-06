import { eq } from "drizzle-orm";
import { AI_MODEL, streamJobSpec } from "@/ai/generate";
import type { JobSpec } from "@/ai/schemas";
import { getDb } from "@/db";
import { auditEvents, jobGenerationRuns, jobs, workflowSteps } from "@/db/schema";
import { renderJob, slugify } from "@/lib/jobs";
import { approveJob, publishJob } from "@/lib/job-lifecycle";
import { getWorkflowMode } from "@/lib/workspace-mode";
import { emitWorkflowChanged } from "@/lib/workflow-events";
import {
  beginJobGenerationStep,
  completeWorkflowStep,
  errorMessage,
  failWorkflowStep,
} from "@/lib/workflow-step-tracking";

async function generateDraft(jobGenerationId: string, prompt: string) {
  "use step";
  console.info("job-generation:generate", { jobGenerationId });
  const stepId = await beginJobGenerationStep(jobGenerationId, {
    key: "generate",
    title: "Generate job description",
    description: "AI structures the role, requirements, and responsibilities.",
    position: 0,
    kind: "ai",
  });
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
    await completeWorkflowStep(stepId, accounting);
    return spec;
  } catch (error) {
    await failWorkflowStep(stepId, error);
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
  const stepId = await beginJobGenerationStep(jobGenerationId, {
    key: "save",
    title: "Save editable draft",
    description: "Create the job record and make it ready for review.",
    position: 1,
  });
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
    await completeWorkflowStep(stepId);
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
    await failWorkflowStep(stepId, error);
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
  const stepId = await beginJobGenerationStep(jobGenerationId, {
    key: "rubric",
    title: "Generate scoring rubric",
    description: "AI creates weighted evaluation criteria automatically in Agent mode.",
    position: 2,
    kind: "ai",
  });
  try {
    const result = await approveJob(jobId, actor);
    await completeWorkflowStep(stepId, result.accounting);
  } catch (error) {
    await failWorkflowStep(stepId, error);
    throw error;
  }
}

async function autoPublish(jobGenerationId: string, jobId: string, actor: string) {
  "use step";
  const stepId = await beginJobGenerationStep(jobGenerationId, {
    key: "publish",
    title: "Publish job",
    description: "Publish the approved role to configured job channels.",
    position: 3,
  });
  try {
    await publishJob(jobId, actor);
    await completeWorkflowStep(stepId);
    await getDb()
      .update(jobGenerationRuns)
      .set({ status: "completed", error: null, updatedAt: new Date(), completedAt: new Date() })
      .where(eq(jobGenerationRuns.id, jobGenerationId));
  } catch (error) {
    await failWorkflowStep(stepId, error);
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
    const message = errorMessage(error, "Generation failed");
    await markFailed(jobGenerationId, message);
    return { failed: true, error: message };
  }
}
