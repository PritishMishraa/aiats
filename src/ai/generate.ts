import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, streamText } from "ai";
import {
  candidateProfileSchema,
  evaluationSchema,
  jobSpecSchema,
  rubricSchema,
  type CandidateProfile,
  type Evaluation,
  type JobSpec,
  type Rubric,
} from "./schemas";

export const AI_MODEL = "openai/gpt-5.6-luna";

const RUBRIC_SYSTEM_PROMPT =
  "Create a hiring rubric using only approved job requirements. Use 4-6 criteria, concrete scoring anchors, and weights totaling exactly 100. Avoid demographic proxies and pedigree bias.";
const PROFILE_SYSTEM_PROMPT =
  "Extract only evidence explicitly present in this resume. Ignore names, email, phone, address, age, gender, photograph, nationality, religion, and marital status. Use null when dates or totals cannot be established. Never infer missing experience.";
const EVALUATION_SYSTEM_PROMPT =
  "Evaluate only against the supplied rubric. Every score must cite resume evidence. Missing evidence is not proof the candidate lacks a skill. Never use protected or identifying attributes. Be conservative and flag uncertainty.";

function model() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  return createOpenRouter({
    apiKey,
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "Hireflow",
    },
  })(AI_MODEL);
}

async function structuredResult<T>(
  schema: Parameters<typeof Output.object<T>>[0]["schema"],
  system: string,
  prompt: string,
) {
  return generateText({
    model: model(),
    maxOutputTokens: 3000,
    output: Output.object({ schema }),
    system,
    prompt,
  });
}

function withAccounting<T>(result: Awaited<ReturnType<typeof structuredResult<T>>>) {
  const openrouter = result.providerMetadata?.openrouter as { usage?: { cost?: number } } | undefined;
  return {
    output: result.output,
    accounting: {
      model: AI_MODEL,
      inputTokens: result.usage.inputTokens ?? null,
      outputTokens: result.usage.outputTokens ?? null,
      costUsd: openrouter?.usage?.cost ?? null,
    },
  };
}

export function streamJobSpec(prompt: string, abortSignal?: AbortSignal) {
  return streamText({
    model: model(),
    maxOutputTokens: 3000,
    output: Output.object({ schema: jobSpecSchema }),
    system:
      "You are an expert, inclusive recruiting partner. Create factual job specifications. Never invent compensation or hard requirements. Put unknowns in missingInformation and disclosed inferences in assumptions. Use concise, candidate-friendly language.",
    prompt,
    abortSignal,
    onError({ error }) {
      console.error("job specification stream failed", error);
    },
  });
}

function validateRubric(rubric: Rubric) {
  const total = rubric.criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (Math.abs(total - 100) > 0.01) throw new Error(`Generated rubric weights total ${total}, not 100`);
  return rubric;
}

export async function generateRubricWithAccounting(spec: JobSpec) {
  const result = withAccounting(await structuredResult(rubricSchema, RUBRIC_SYSTEM_PROMPT, JSON.stringify(spec)));
  return { ...result, output: validateRubric(result.output as Rubric) };
}

export async function extractCandidateProfileWithAccounting(resume: string) {
  const result = withAccounting(await structuredResult(candidateProfileSchema, PROFILE_SYSTEM_PROMPT, resume));
  return { ...result, output: result.output as CandidateProfile };
}

export async function evaluateCandidateWithAccounting(profile: unknown, rubric: Rubric) {
  const result = withAccounting(
    await structuredResult(evaluationSchema, EVALUATION_SYSTEM_PROMPT, JSON.stringify({ profile, rubric })),
  );
  return { ...result, output: result.output as Evaluation };
}
