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
import {
  beginApplicationStep,
  completeWorkflowStep,
  errorMessage,
  failWorkflowStep,
} from "@/lib/workflow-step-tracking";

async function loadApplication(applicationId: string) {
  "use step";
  const stepId = await beginApplicationStep(applicationId, {
    key: "load",
    title: "Load application",
    description: "Validate the application and approved hiring rubric.",
    position: 0,
  });
  try {
    const [row] = await getDb()
      .select({ application: applications, job: jobs })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.id, applicationId))
      .limit(1);
    if (!row?.job.rubric) throw new Error("The job rubric is not approved");
    await completeWorkflowStep(stepId);
    return row;
  } catch (error) {
    await failWorkflowStep(stepId, error);
    throw error;
  }
}

async function extractResume(applicationId: string, resumeUrl: string) {
  "use step";
  const stepId = await beginApplicationStep(applicationId, {
    key: "extract",
    title: "Extract resume",
    description: "Read and classify the candidate's PDF.",
    position: 1,
  });
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
    await completeWorkflowStep(stepId, undefined, {
      pdfType: classification.pdfType,
      confidence: classification.confidence,
      pages: pages.pages.length,
    });
    return { text, confidence: classification.confidence };
  } catch (error) {
    await failWorkflowStep(stepId, error);
    throw error;
  }
}

async function buildProfile(applicationId: string, resumeText: string) {
  "use step";
  const stepId = await beginApplicationStep(applicationId, {
    key: "profile",
    title: "Build candidate profile",
    description: "AI extracts job-relevant evidence from the resume.",
    position: 2,
    kind: "ai",
  });
  try {
    await getDb().update(applications).set({ status: "evaluating" }).where(eq(applications.id, applicationId));
    const result = await extractCandidateProfileWithAccounting(resumeText);
    await getDb().update(applications).set({ profile: result.output }).where(eq(applications.id, applicationId));
    await completeWorkflowStep(stepId, result.accounting);
    return result.output;
  } catch (error) {
    await failWorkflowStep(stepId, error);
    throw error;
  }
}

async function evaluateProfile(applicationId: string, confidence: number) {
  "use step";
  const stepId = await beginApplicationStep(applicationId, {
    key: "evaluate",
    title: "Evaluate against rubric",
    description: "AI scores resume evidence against the approved criteria.",
    position: 3,
    kind: "ai",
  });
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
        // The workflow UI subscribes while this is "evaluating". The scheduling step owns the terminal status.
        evaluatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));
    await completeWorkflowStep(stepId, result.accounting, {
      score: recommendation.score,
      recommendation: recommendation.recommendation,
    });
    return recommendation;
  } catch (error) {
    await failWorkflowStep(stepId, error);
    throw error;
  }
}

async function queueInterviewSchedulingDecision(applicationId: string, eligible: boolean) {
  "use step";
  const description = eligible
    ? "Strong or potential fit identified. Awaiting an interview invitation to be sent."
    : "Awaiting a human decision on whether to send an interview invitation.";
  await Promise.all([
    getDb().update(applications).set({ status: "review" }).where(eq(applications.id, applicationId)),
    getDb()
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
      }),
  ]);
  await emitWorkflowChanged();
}

async function finishSchedulingDecision(applicationId: string, eligible: boolean) {
  "use step";
  if (!eligible) {
    await Promise.all([
      getDb().update(applications).set({ status: "review" }).where(eq(applications.id, applicationId)),
      getDb()
        .insert(workflowSteps)
        .values({
          applicationId,
          key: "schedule",
          title: "Interview scheduling decision",
          description: "Candidate was not tagged as a strong or potential fit, so no interview was scheduled automatically.",
          position: 4,
          status: "completed",
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [workflowSteps.applicationId, workflowSteps.key],
          set: {
            description:
              "Candidate was not tagged as a strong or potential fit, so no interview was scheduled automatically.",
            status: "completed",
            completedAt: new Date(),
          },
        }),
    ]);
    await emitWorkflowChanged();
    return null;
  }

  const stepId = await beginApplicationStep(applicationId, {
    key: "schedule",
    title: "Schedule first interview",
    description: "Agent mode schedules the first available company interview for strong- and potential-fit candidates.",
    position: 4,
  });
  try {
    const interview = await scheduleInterview(applicationId);
    await emitWorkflowChanged();
    return interview;
  } catch (error) {
    await failWorkflowStep(stepId, error);
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
    const eligible = ["strong_fit", "potential_fit"].includes(result.recommendation);
    if ((await readWorkflowMode()) === "agent") await finishSchedulingDecision(applicationId, eligible);
    else await queueInterviewSchedulingDecision(applicationId, eligible);
    return result;
  } catch (error) {
    const message = errorMessage(error, "Evaluation failed");
    await markFailed(applicationId, message);
    return { failed: true, error: message };
  }
}
