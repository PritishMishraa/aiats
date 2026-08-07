import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CandidateProfile, Evaluation, JobSpec, Rubric } from "@/ai/schemas";
export const jobStatus = pgEnum("job_status", ["draft", "review", "approved", "published", "closed"]);
export const applicationStatus = pgEnum("application_status", [
  "submitted",
  "extracting",
  "evaluating",
  "review",
  "interview_invited",
  "interview_scheduled",
  "rejected",
  "failed",
]);
export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  status: jobStatus("status").notNull().default("draft"),
  sourcePrompt: text("source_prompt").notNull(),
  jobSpec: jsonb("job_spec").$type<JobSpec>().notNull(),
  renderedHtml: text("rendered_html").notNull(),
  rubric: jsonb("rubric").$type<Rubric>(),
  rubricVersion: integer("rubric_version").notNull().default(0),
  createdBy: text("created_by").notNull(),
  aiModel: text("ai_model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
});
export const jobPostings = pgTable(
  "job_postings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    externalId: text("external_id"),
    externalUrl: text("external_url"),
    demo: boolean("demo").notNull().default(false),
    error: text("error"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("job_provider_unique").on(table.jobId, table.provider)],
);
export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  linkedinUrl: text("linkedin_url"),
  consent: boolean("consent").notNull(),
  resumeUrl: text("resume_url").notNull(),
  resumeName: text("resume_name").notNull(),
  resumeSha256: text("resume_sha256").notNull(),
  status: applicationStatus("status").notNull().default("submitted"),
  extractionText: text("extraction_text"),
  extractionType: text("extraction_type"),
  extractionConfidence: real("extraction_confidence"),
  profile: jsonb("profile").$type<CandidateProfile>(),
  evaluation: jsonb("evaluation").$type<Evaluation>(),
  weightedScore: real("weighted_score"),
  recommendation: text("recommendation"),
  needsHumanReview: boolean("needs_human_review"),
  workflowRunId: text("workflow_run_id"),
  failureReason: text("failure_reason"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
});
export const interviews = pgTable("interviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" })
    .unique(),
  provider: text("provider").notNull().default("cal.com"),
  bookingUid: text("booking_uid"),
  bookingUrl: text("booking_url"),
  startAt: timestamp("start_at", { withTimezone: true }),
  endAt: timestamp("end_at", { withTimezone: true }),
  meetingUrl: text("meeting_url"),
  status: text("status").notNull().default("invited"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const workspaceSettings = pgTable("workspace_settings", {
  id: text("id").primaryKey(),
  techLeadEmail: text("tech_lead_email"),
  workflowMode: text("workflow_mode").notNull().default("agent"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
export const jobGenerationRuns = pgTable("job_generation_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowRunId: text("workflow_run_id"),
  status: text("status").notNull().default("queued"),
  prompt: text("prompt").notNull(),
  draft: jsonb("draft").$type<Partial<JobSpec>>(),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  error: text("error"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
export const workflowSteps = pgTable(
  "workflow_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id").references(() => applications.id, { onDelete: "cascade" }),
    jobGenerationId: uuid("job_generation_id").references(() => jobGenerationRuns.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    kind: text("kind").notNull().default("system"),
    status: text("status").notNull().default("running"),
    position: integer("position").notNull(),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: real("cost_usd"),
    error: text("error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("workflow_step_application_key_unique").on(table.applicationId, table.key),
    uniqueIndex("workflow_step_job_generation_key_unique").on(table.jobGenerationId, table.key),
  ],
);
