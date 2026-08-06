import { get } from "@vercel/blob";
import { classifyPdf, extractPagesMarkdown } from "@firecrawl/pdf-inspector";
import { eq } from "drizzle-orm";
import { extractCandidateProfile, extractCandidateProfileFromPdf, evaluateCandidate } from "@/ai/generate";
import { getDb } from "@/db";
import { applications, interviews, jobs } from "@/db/schema";
import { weightedRecommendation } from "@/lib/jobs";

async function evaluateApplicationStep(applicationId: string) {
  "use step";
  console.info("evaluation:pipeline", { applicationId });
  const [row] = await getDb().select({ application: applications, job: jobs }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.id, applicationId)).limit(1);
  if (!row?.job.rubric) throw new Error("The job rubric is not approved");
  await getDb().update(applications).set({ status: "extracting" }).where(eq(applications.id, applicationId));
  const blob = await get(row.application.resumeUrl, { access: "private" });
  if (!blob || blob.statusCode !== 200) throw new Error("Resume could not be read from private storage");
  const bytes = Buffer.from(await new Response(blob.stream).arrayBuffer());
  const classification = classifyPdf(bytes), pages = extractPagesMarkdown(bytes);
  const text = pages.pages.map((page) => page.markdown).filter(Boolean).join("\n\n");
  const requiresPdfVision = text.trim().length < 80;
  const extractionConfidence = requiresPdfVision ? Math.min(classification.confidence, 0.7) : classification.confidence;
  await getDb().update(applications).set({ status: "evaluating", extractionText: text || null, extractionType: requiresPdfVision ? `${classification.pdfType}:model_ocr` : classification.pdfType, extractionConfidence }).where(eq(applications.id, applicationId));
  const profile = requiresPdfVision ? await extractCandidateProfileFromPdf(bytes) : await extractCandidateProfile(text);
  const evaluation = await evaluateCandidate(profile, row.job.rubric);
  const result = weightedRecommendation(evaluation, row.job.rubric, extractionConfidence);
  await getDb().update(applications).set({ profile, evaluation, weightedScore: result.score, recommendation: result.recommendation, needsHumanReview: result.needsHumanReview, status: "review", evaluatedAt: new Date() }).where(eq(applications.id, applicationId));
  if (result.recommendation === "strong_fit" && !result.needsHumanReview) { const bookingUrl = new URL("https://cal.com/pritish/15min"); bookingUrl.searchParams.set("name", row.application.candidateName); bookingUrl.searchParams.set("email", row.application.candidateEmail); await getDb().insert(interviews).values({ applicationId, bookingUrl: bookingUrl.toString(), status: "invited" }).onConflictDoNothing(); await getDb().update(applications).set({ status: "interview_invited" }).where(eq(applications.id, applicationId)); }
  return result;
}
async function markEvaluationFailed(applicationId: string, message: string) { "use step"; console.error("evaluation:failed", { applicationId, message }); await getDb().update(applications).set({ status: "failed", failureReason: message }).where(eq(applications.id, applicationId)); }
export async function durableEvaluationWorkflow(applicationId: string) {
  "use workflow";
  console.info("evaluation:start", { applicationId });
  try { return await evaluateApplicationStep(applicationId); }
  catch (error) { const message = error instanceof Error ? error.message : "Evaluation failed"; await markEvaluationFailed(applicationId, message); return { failed: true, error: message }; }
}
