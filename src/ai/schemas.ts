import { z } from "zod";

export const jobSpecSchema = z.object({
  title: z.string().min(2), department: z.string(), summary: z.string(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]), workplaceType: z.enum(["onsite", "hybrid", "remote"]),
  location: z.object({ city: z.string().nullable(), country: z.string().nullable(), timezone: z.string().nullable() }),
  experience: z.object({ minimumYears: z.number().nonnegative().nullable(), maximumYears: z.number().nonnegative().nullable() }),
  responsibilities: z.array(z.string()).min(3), requiredQualifications: z.array(z.string()).min(1), preferredQualifications: z.array(z.string()),
  compensation: z.object({ currency: z.string(), minimum: z.number(), maximum: z.number(), interval: z.enum(["hour", "month", "year"]) }).nullable(),
  benefits: z.array(z.string()), applicationQuestions: z.array(z.object({ id: z.string(), question: z.string(), required: z.boolean() })), assumptions: z.array(z.string()), missingInformation: z.array(z.string()),
});
export const rubricSchema = z.object({ version: z.number().int().positive(), criteria: z.array(z.object({ id: z.string(), name: z.string(), description: z.string(), weight: z.number().min(0).max(100), required: z.boolean(), scoringGuide: z.object({ zero: z.string(), three: z.string(), five: z.string() }) })).min(1) });
export const candidateProfileSchema = z.object({ skills: z.array(z.object({ name: z.string(), evidence: z.array(z.string()) })), employment: z.array(z.object({ title: z.string(), company: z.string().nullable(), startDate: z.string().nullable(), endDate: z.string().nullable(), highlights: z.array(z.string()) })), education: z.array(z.object({ qualification: z.string(), institution: z.string().nullable() })), projects: z.array(z.object({ name: z.string(), technologies: z.array(z.string()), highlights: z.array(z.string()) })), totalRelevantExperienceMonths: z.number().nullable() });
export const evaluationSchema = z.object({ criteria: z.array(z.object({ criterionId: z.string(), score: z.number().min(0).max(5), confidence: z.enum(["low", "medium", "high"]), evidence: z.array(z.string()), reasoning: z.string() })), missingEvidence: z.array(z.string()), concerns: z.array(z.string()), summary: z.string() });
export type JobSpec = z.infer<typeof jobSpecSchema>; export type Rubric = z.infer<typeof rubricSchema>; export type CandidateProfile = z.infer<typeof candidateProfileSchema>; export type Evaluation = z.infer<typeof evaluationSchema>;
