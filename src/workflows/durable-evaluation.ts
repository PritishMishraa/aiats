import { get } from "@vercel/blob";
import { classifyPdf, extractPagesMarkdown } from "@firecrawl/pdf-inspector";
import { eq } from "drizzle-orm";
import { extractCandidateProfileWithAccounting, evaluateCandidateWithAccounting } from "@/ai/generate";
import { getDb } from "@/db";
import { applications, jobs, workflowSteps } from "@/db/schema";
import { weightedRecommendation } from "@/lib/jobs";
import { scheduleInterview } from "@/lib/interview-scheduling";
import { getWorkflowMode } from "@/lib/workspace-mode";
import { emitWorkflowChanged } from "@/lib/workflow-events";

type Accounting = { model: string; inputTokens: number | null; outputTokens: number | null; costUsd: number | null };

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return fallback;
}

async function beginStep(
  applicationId: string,
  key: string,
  title: string,
  description: string,
  position: number,
  kind = "system",
) {
  const [step] = await getDb()
    .insert(workflowSteps)
    .values({ applicationId, key, title, description, position, kind, status: "running", startedAt: new Date() })
    .onConflictDoUpdate({
      target: [workflowSteps.applicationId, workflowSteps.key],
      set: { status: "running", error: null, startedAt: new Date(), completedAt: null },
    })
    .returning({ id: workflowSteps.id });
  await emitWorkflowChanged();
  return step.id;
}
async function completeStep(id: string, accounting?: Accounting, metadata?: Record<string, unknown>) {
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
async function failStep(id: string, error: unknown) {
  const message = errorMessage(error, "Step failed");
  await getDb()
    .update(workflowSteps)
    .set({ status: "failed", error: message, completedAt: new Date() })
    .where(eq(workflowSteps.id, id));
  await emitWorkflowChanged();
}

async function loadApplication(applicationId: string) {
  "use step";
  const stepId = await beginStep(
    applicationId,
    "load",
    "Load application",
    "Validate the application and approved hiring rubric.",
    0,
  );
  try {
    const [row] = await getDb()
      .select({ application: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!row?.job.rubric) throw new Error("The job rubric is not approved");
    await completeStep(stepId);
    return row;
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function extractResume(applicationId: string, resumeUrl: string) {
  "use step";
  const stepId = await beginStep(
    applicationId,
    "extract",
    "Extract resume",
    "Read and classify the candidate's PDF.",
    1,
  );
  try {
    await getDb().update(applications).set({ status: "extracting" }).where(eq(applications.id, applicationId));
    const blob = await get(resumeUrl, { access: "private" });
    if (!blob || blob.statusCode !== 200) throw new Error("Resume could not be read from private storage");
    const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
    const classification = classifyPdf(bytes);
    const pages = extractPagesMarkdown(bytes);
    const text = pages.pages
      .map((page) => page.markdown)
      .filter(Boolean)
      .join("\n\n");
    if (text.trim().length < 80)
      throw new Error(`Resume is ${classification.pdfType} and requires OCR. Please upload a text-searchable PDF.`);
    await getDb()
      .update(applications)
      .set({
        extractionText: text,
        extractionType: classification.pdfType,
        extractionConfidence: classification.confidence,
      })
      .where(eq(applications.id, applicationId));
    await completeStep(stepId, undefined, {
      pdfType: classification.pdfType,
      confidence: classification.confidence,
      pages: pages.pages.length,
    });
    return { text, confidence: classification.confidence };
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function buildProfile(applicationId: string, resumeText: string) {
  "use step";
  const stepId = await beginStep(
    applicationId,
    "profile",
    "Build candidate profile",
    "AI extracts job-relevant evidence from the resume.",
    2,
    "ai",
  );
  try {
    await getDb().update(applications).set({ status: "evaluating" }).where(eq(applications.id, applicationId));
    const result = await extractCandidateProfileWithAccounting(resumeText);
    await getDb().update(applications).set({ profile: result.output }).where(eq(applications.id, applicationId));
    await completeStep(stepId, result.accounting);
    return result.output;
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function evaluateProfile(applicationId: string, confidence: number) {
  "use step";
  const stepId = await beginStep(
    applicationId,
    "evaluate",
    "Evaluate against rubric",
    "AI scores resume evidence against the approved criteria.",
    3,
    "ai",
  );
  try {
    const [row] = await getDb()
      .select({ profile: applications.profile, rubric: jobs.rubric })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!row?.profile) throw new Error("The candidate profile is missing");
    if (!row.rubric) throw new Error("The job rubric is not approved");
    const { profile, rubric } = row;
    const result = await evaluateCandidateWithAccounting(profile, rubric);
    const recommendation = weightedRecommendation(result.output, rubric, confidence);
    await getDb()
      .update(applications)
      .set({
        evaluation: result.output,
        weightedScore: recommendation.score,
        recommendation: recommendation.recommendation,
        needsHumanReview: recommendation.needsHumanReview,
        status: "review",
        evaluatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await completeStep(stepId, result.accounting, {
      score: recommendation.score,
      recommendation: recommendation.recommendation,
    });
    return recommendation;
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function queueInterviewSchedulingDecision(applicationId: string, eligible: boolean) {
  "use step";
  const description = eligible
    ? "Strong fit identified. Awaiting an interview invitation to be sent."
    : "Awaiting a human decision on whether to send an interview invitation.";
  await getDb()
    .insert(workflowSteps)
    .values({
      applicationId,
      key: "schedule",
      title: "Interview scheduling decision",
      description,
      position: 4,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [workflowSteps.applicationId, workflowSteps.key],
      set: { title: "Interview scheduling decision", description, status: "pending", completedAt: null },
    });
  await emitWorkflowChanged();
}

async function finishSchedulingDecision(applicationId: string, eligible: boolean) {
  "use step";
  if (!eligible) {
    await getDb()
      .insert(workflowSteps)
      .values({
        applicationId,
        key: "schedule",
        title: "Interview scheduling decision",
        description: "Candidate was not tagged as a strong fit, so no interview was scheduled automatically.",
        position: 4,
        status: "completed",
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [workflowSteps.applicationId, workflowSteps.key],
        set: {
          description: "Candidate was not tagged as a strong fit, so no interview was scheduled automatically.",
          status: "completed",
          completedAt: new Date(),
        },
      });
    await emitWorkflowChanged();
    return null;
  }

  const stepId = await beginStep(
    applicationId,
    "schedule",
    "Schedule first interview",
    "Agent mode schedules the first available company interview for strong-fit candidates.",
    4,
  );
  try {
    return await scheduleInterview(applicationId);
  } catch (error) {
    await failStep(stepId, error);
    throw error;
  }
}

async function readWorkflowMode() {
  "use step";
  return getWorkflowMode();
}

async function markFailed(applicationId: string, message: string) {
  "use step";
  await getDb()
    .update(applications)
    .set({ status: "failed", failureReason: message })
    .where(eq(applications.id, applicationId));
  await emitWorkflowChanged();
}

export async function durableEvaluationWorkflow(applicationId: string) {
  "use workflow";
  try {
    const row = await loadApplication(applicationId);
    const extraction = await extractResume(applicationId, row.application.resumeUrl);
    await buildProfile(applicationId, extraction.text);
    const result = await evaluateProfile(applicationId, extraction.confidence);
    const eligible = result.recommendation === "strong_fit" && !result.needsHumanReview;
    if ((await readWorkflowMode()) === "agent") await finishSchedulingDecision(applicationId, eligible);
    else await queueInterviewSchedulingDecision(applicationId, eligible);
    return result;
  } catch (error) {
    const message = errorMessage(error, "Evaluation failed");
    await markFailed(applicationId, message);
    return { failed: true, error: message };
  }
}
