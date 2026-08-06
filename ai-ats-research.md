[Skip to content](https://chatgpt.com/share/6a731d68-0f90-83ee-8307-c814c51a3983#main)

## Chat history

This is a copy of a shared ChatGPT conversation

Report conversation

Today5:19 AM

#### You said:

i want to build this demo pipeline for my interview assignment. this was the crude brief i was given.

hrs spend tedious time crafting JDs

they want to automate the process

they should be able to generate a JD from a text prompt

they should also be able to go and refine manually too

with a click of a button they should be able to post this job opportunity on different portals

please find me these sites where we can programmatically post jobs and also we need to create a dummy portal for candidates

when we start receiving the resumes of the candidate, another workflow should be kicked off that based on a rubric that scores candidates (with a tag like strong fit, potential fit, unfit and a short text for the reasoning behind it) and go ahead and schedule the first meetings with them.

\-\-\-

Here is what i have though of:

openrouter and vercel ai sdk

gpt 5.6 luna with structured output (https://openrouter.ai/openai/gpt-5.6-luna)

to exract text form candidates pdf resumes (https://firecrawl.github.io/pdf-inspector/)

postgress on neon as db to store whatever we need and also as a job queue

\-\-\-

Here are the compromises that i have thought of:

no auth but we only allow the operations to be done by these emails: adnaan@kgen.io and pritishmishra579@gmail.com , we can hardcore this in the backend and ask about it on the frontend

talk to me about durable workflows, if we should have them, if yes then how?

we can use my cal calendar to schedule the dummy meetings of the dummy candidates

\-\-\-

the things i have currently little idea about:

how we generate the JD (mostly reagarding the most proformat tools, like we have pdf inspector which is absurdly fast)

\-\-\-

help me fill in the gaps and solidify the project

Show moreShow less

#### ChatGPT said:

Worked for 4m 10s

Build this as a **small AI-native ATS**, not merely a JD generator. The strongest demo tells one complete story:

```

HR creates job
    ↓
AI generates structured JD
    ↓
HR manually edits and approves it
    ↓
Job is published through provider adapters
    ↓
Candidate applies through public portal
    ↓
Resume is extracted and evaluated against an approved rubric
    ↓
HR receives evidence-backed recommendation
    ↓
Strong candidates receive a scheduling invitation
    ↓
Booking webhook updates the pipeline
```

## 1\. Recommended stack

| Component | Recommendation |
| --- | --- |
| Application | Next.js, TypeScript, Tailwind, shadcn/ui |
| AI integration | Vercel AI SDK + OpenRouter |
| Primary model | `openai/gpt-5.6-luna` |
| Structured content | Zod schemas |
| Rich-text JD editor | Tiptap |
| Database | Neon Postgres + Drizzle |
| Resume files | Private Vercel Blob |
| PDF extraction | Firecrawl PDF Inspector |
| Background orchestration | Vercel Workflows |
| Scheduling | Cal.com API |
| Admin access | Frontend email prompt with backend allowlist |
| Candidate portal | Public Next.js routes in the same application |

GPT-5.6 Luna is positioned as a fast, cost-efficient model for classification and lightweight agentic workflows, making it suitable for JD drafting and first-pass candidate evaluation. OpenRouter has an AI SDK provider, so you can use it without building your own provider abstraction. [![](https://www.google.com/s2/favicons?domain=https://openrouter.ai&sz=128)OpenRouter+1](https://openrouter.ai/openai/gpt-5.6-luna-20260709?utm_source=chatgpt.com)

For current AI SDK versions, use `generateText()` with `Output.object({ schema })` rather than designing around older `generateObject()` examples. Schema failures can be caught through `NoObjectGeneratedError`. [![](https://www.google.com/s2/favicons?domain=https://ai-sdk.dev&sz=128)AI SDK+1](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data?utm_source=chatgpt.com)

* * *

# 2\. The product should have two surfaces

## Admin application

Suggested routes:

```

/admin/jobs
/admin/jobs/new
/admin/jobs/[jobId]/edit
/admin/jobs/[jobId]/publish
/admin/jobs/[jobId]/candidates
/admin/candidates/[applicationId]
/admin/workflows
```

The admin can:

- Generate a JD from a prompt.

- Manually edit every section.

- Generate and edit the candidate rubric.

- Publish or close a job.

- See publishing status for every portal.

- View candidates grouped by recommendation.

- Inspect criterion-level scores and evidence.

- Invite candidates to interview.


## Candidate portal

Suggested routes:

```

/careers
/careers/[jobSlug]
/careers/[jobSlug]/apply
/application/[publicToken]
```

The candidate can:

- Browse active jobs.

- Read the JD.

- Submit name, email, optional LinkedIn URL and resume.

- Give consent for automated resume analysis.

- Receive an application reference.

- Book an interview when invited.


Do not expose candidate resumes or internal evaluation details through the public application-status page.

* * *

# 3\. JD generation design

There is no specialized equivalent of PDF Inspector that will dramatically accelerate JD generation. JD generation is mainly an LLM task. The performance and quality improvements come from generating a **canonical structured object**, not formatted prose.

Do not ask the model to generate arbitrary HTML.

Use this flow:

```

Text prompt
   ↓
Structured JobSpec
   ↓
HR edits fields
   ↓
JobSpec rendered into Tiptap JSON
   ↓
Tiptap rich-text manual editing
   ↓
Provider-specific payloads generated deterministically
```

## Canonical job schema

A simplified version could look like this:

```
TypeScript

import { z } from "zod";

export const JobSpecSchema = z.object({
  title: z.string().min(2),
  department: z.string(),
  summary: z.string(),

  employmentType: z.enum([\
    "full_time",\
    "part_time",\
    "contract",\
    "internship",\
    "temporary",\
  ]),

  workplaceType: z.enum(["onsite", "hybrid", "remote"]),

  location: z.object({
    city: z.string().nullable(),
    country: z.string().nullable(),
    timezone: z.string().nullable(),
  }),

  experience: z.object({
    minimumYears: z.number().nonnegative().nullable(),
    maximumYears: z.number().nonnegative().nullable(),
  }),

  responsibilities: z.array(z.string()).min(3),
  requiredQualifications: z.array(z.string()).min(1),
  preferredQualifications: z.array(z.string()),

  compensation: z
    .object({
      currency: z.string(),
      minimum: z.number(),
      maximum: z.number(),
      interval: z.enum(["hour", "month", "year"]),
    })
    .nullable(),

  benefits: z.array(z.string()),

  applicationQuestions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      required: z.boolean(),
    }),
  ),

  assumptions: z.array(z.string()),
  missingInformation: z.array(z.string()),
});
```

The important fields are `assumptions` and `missingInformation`. Instead of silently hallucinating a salary, location or required experience, the model tells HR what it assumed.

## Generation workflow

Use two separate AI operations:

### Operation 1: Generate the JobSpec

Input:

- HR prompt

- Company context

- Existing defaults

- Supported enums

- Writing rules


Output:

- Structured `JobSpec`

- Assumptions

- Missing information


### Operation 2: Generate the scoring rubric

Only run this after the HR has edited and approved the JobSpec.

This prevents the rubric from being based on an earlier version of the JD.

## Rich-text editing

Tiptap stores documents as structured JSON and can render or export JSON and HTML. Persisting JSON is preferable because it remains editable and schema-driven. [![](https://www.google.com/s2/favicons?domain=https://tiptap.dev&sz=128)Tiptap+2![](https://www.google.com/s2/favicons?domain=https://tiptap.dev&sz=128)Tiptap+2](https://tiptap.dev/docs/guides/output-json-html?utm_source=chatgpt.com)

Store both:

```
TypeScript

{
  jobSpec: JobSpec;          // source of truth for integrations
  editorDocument: JSON;     // manually edited presentation
  renderedHtml: string;     // cached public rendering
}
```

The structured `JobSpec` powers integrations and scoring. The editor document powers the human-facing job description.

Useful editor actions:

- Rewrite selected text

- Make more concise

- Make more inclusive

- Add responsibilities

- Convert qualification to preferred

- Regenerate only this section


Do not regenerate the entire JD when HR edits one paragraph.

* * *

# 4\. Candidate rubric design

The rubric should also be structured and versioned.

```
TypeScript

export const RubricSchema = z.object({
  version: z.number(),
  criteria: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number().min(0).max(100),
      required: z.boolean(),
      scoringGuide: z.object({
        zero: z.string(),
        three: z.string(),
        five: z.string(),
      }),
    }),
  ),
});
```

Example:

```
JSON

{
  "criteria": [\
    {\
      "id": "backend-experience",\
      "name": "Backend engineering experience",\
      "weight": 30,\
      "required": true\
    },\
    {\
      "id": "typescript",\
      "name": "TypeScript proficiency",\
      "weight": 20,\
      "required": true\
    },\
    {\
      "id": "databases",\
      "name": "Database design experience",\
      "weight": 20,\
      "required": false\
    },\
    {\
      "id": "ownership",\
      "name": "Demonstrated project ownership",\
      "weight": 20,\
      "required": false\
    },\
    {\
      "id": "communication",\
      "name": "Written communication",\
      "weight": 10,\
      "required": false\
    }\
  ]
}
```

Validate in application code that weights total 100.

## Evaluation output

The model should not merely return `"strong fit"` and a paragraph. Require evidence for every score:

```
TypeScript

export const EvaluationSchema = z.object({
  criteria: z.array(
    z.object({
      criterionId: z.string(),
      score: z.number().min(0).max(5),
      confidence: z.enum(["low", "medium", "high"]),
      evidence: z.array(z.string()),
      reasoning: z.string(),
    }),
  ),

  missingEvidence: z.array(z.string()),
  concerns: z.array(z.string()),
  summary: z.string(),
});
```

Then compute the final score and label in TypeScript:

```
TypeScript

const weightedScore = criteria.reduce(
  (total, result) =>
    total + (result.score / 5) * rubricWeight(result.criterionId),
  0,
);

const label =
  weightedScore >= 75
    ? "strong_fit"
    : weightedScore >= 50
      ? "potential_fit"
      : "unfit";
```

This is much better than allowing the model to arbitrarily select a category.

Also introduce:

```
TypeScript

needsHumanReview =
  criteria.some((criterion) => criterion.confidence === "low") ||
  extractionConfidence < threshold ||
  requiredCriterionHasNoEvidence;
```

“Not mentioned in the resume” should mean **not evidenced**, not necessarily “candidate does not possess the skill.”

* * *

# 5\. Resume extraction pipeline

PDF Inspector is a good first-stage choice. It detects text-based, scanned, image-based and mixed PDFs, and can extract text-based files locally without OCR. It also identifies pages needing OCR, allowing page-level fallback rather than OCRing the entire document. [![](https://www.google.com/s2/favicons?domain=https://github.com&sz=128)GitHub](https://github.com/firecrawl/pdf-inspector?utm_source=chatgpt.com)

Recommended pipeline:

```

Resume uploaded
   ↓
Validate MIME type and size
   ↓
Store original PDF privately
   ↓
PDF Inspector classification
   ├── Text-based → local Markdown extraction
   ├── Mixed → local extraction + OCR affected pages
   ↓
Normalize resume into CandidateProfile
   ↓
Remove evaluation-irrelevant identifiers
   ↓
Score against rubric
```

## Candidate profile schema

Run a separate structured extraction before scoring:

```
TypeScript

const CandidateProfileSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      evidence: z.array(z.string()),
    }),
  ),

  employment: z.array(
    z.object({
      title: z.string(),
      company: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      highlights: z.array(z.string()),
    }),
  ),

  education: z.array(
    z.object({
      qualification: z.string(),
      institution: z.string().nullable(),
    }),
  ),

  projects: z.array(
    z.object({
      name: z.string(),
      technologies: z.array(z.string()),
      highlights: z.array(z.string()),
    }),
  ),

  totalRelevantExperienceMonths: z.number().nullable(),
});
```

This gives you:

```

Raw PDF → Extracted Markdown → CandidateProfile → Evaluation
```

Each intermediate result becomes inspectable in the UI, which is valuable during the interview demonstration.

* * *

# 6\. Use durable workflows

Yes, this project has a genuine need for durable workflows.

A normal API route is insufficient because processing may involve:

- File extraction

- OCR provider calls

- LLM calls

- Retries

- Multiple portal APIs

- Human approval

- Waiting for a candidate booking

- Webhooks

- Deployment or function failures


Vercel Workflows provides persisted steps, retries, pauses, hooks and observability. Workflow functions can survive crashes or deployments and resume from their last completed step. Vercel announced Workflows as generally available in April 2026. [![](https://www.google.com/s2/favicons?domain=https://vercel.com&sz=128)Vercel+1](https://vercel.com/blog/introducing-workflow?utm_source=chatgpt.com)

## Do not use Neon as the job queue

Use Neon for:

- Jobs

- Applications

- Evaluations

- Rubrics

- External posting IDs

- Interview records

- Audit events


Use Vercel Workflows for:

- Queuing

- Retries

- Orchestration

- Waiting

- Resuming

- Run observability


Building both a Postgres queue and a durable workflow layer would duplicate responsibilities.

## Workflow 1: Job publishing

```
TypeScript

export async function publishJobWorkflow(jobId: string) {
  "use workflow";

  const job = await loadApprovedJob(jobId);

  const results = await Promise.allSettled([\
    publishToInternalPortal(job.id),\
    publishToGoogleJobs(job.id),\
    publishToLever(job.id),\
    publishToLinkedInMock(job.id),\
    publishToIndeedMock(job.id),\
  ]);

  await savePublishingResults(job.id, results);
}
```

Every portal operation should be a `"use step"` function.

## Workflow 2: Candidate evaluation

```
TypeScript

export async function evaluateApplicationWorkflow(
  applicationId: string,
) {
  "use workflow";

  const extraction = await extractResume(applicationId);
  const profile = await createCandidateProfile(
    applicationId,
    extraction,
  );

  const evaluation = await evaluateAgainstRubric(
    applicationId,
    profile,
  );

  const recommendation = await persistEvaluation(
    applicationId,
    evaluation,
  );

  if (
    recommendation.label === "strong_fit" &&
    !recommendation.needsHumanReview
  ) {
    await sendSchedulingInvitation(applicationId);

    const booking = await waitForBookingWebhook(applicationId);

    await saveInterview(applicationId, booking);
  }

  return recommendation;
}
```

For external calls:

- Use idempotency keys.

- Treat authentication and validation failures as permanent.

- Retry rate limits, network failures and transient 5xx responses.

- Store the provider’s external ID immediately after a successful call.

- Pass IDs into workflows, not entire resume bodies.

- Keep raw PII out of workflow logs.


## Human-in-the-loop option

A stronger workflow is:

```

Strong fit generated
    ↓
HR receives “Approve scheduling invitation”
    ↓
Workflow waits at approval hook
    ↓
HR approves
    ↓
Scheduling email sent
    ↓
Workflow waits for Cal.com webhook
    ↓
Interview marked scheduled
```

That demonstrates both durability and human oversight.

* * *

# 7\. Job portals and APIs

The important finding is that most large job boards do **not** provide an unrestricted API where any developer can immediately publish jobs.

| Platform | Can jobs be posted programmatically? | Demo suitability |
| --- | --- | --- |
| Your candidate portal | Yes, completely controlled by you | **Implement for real** |
| Google Jobs | Publish your own `JobPosting` page and notify Google through the Indexing API | **Implement for real** |
| Lever | Authenticated API can create and update postings | Real only with Lever credentials |
| Greenhouse | Harvest API can create jobs and update or publish job posts | Real only with Greenhouse credentials |
| Ashby | API supports creating jobs, opening them and updating postings | Real only with Ashby credentials |
| LinkedIn | Restricted to approved partners; it is not currently accepting new Job Posting API partnerships | Mock adapter |
| Indeed | Job Sync API is intended for verified ATS partners | Mock adapter |

Google’s Indexing API explicitly supports pages containing `JobPosting` structured data and lets site owners notify Google when a job page is added, updated or removed. This makes your custom candidate portal a legitimate distribution channel rather than merely a dummy UI. [![](https://www.google.com/s2/favicons?domain=https://developers.google.com&sz=128)Google for Developers](https://developers.google.com/search/apis/indexing-api/v3/quickstart?utm_source=chatgpt.com)

Lever’s authenticated API supports creating and updating postings, and its documentation mentions temporary sandbox accounts as part of partner integration onboarding. [![](https://www.google.com/s2/favicons?domain=https://hire.lever.co&sz=128)Lever+1](https://hire.lever.co/developer/documentation?utm_source=chatgpt.com)

Greenhouse Harvest supports creating jobs, updating job-post content and setting a job post live or offline. [![](https://www.google.com/s2/favicons?domain=https://developers.greenhouse.io&sz=128)Greenhouse Developers](https://developers.greenhouse.io/harvest.html?utm_source=chatgpt.com)

Ashby exposes job creation, job status changes and job-post updates through API keys with jobs write permission. [![](https://www.google.com/s2/favicons?domain=https://developers.ashbyhq.com&sz=128)Ashby+2![](https://www.google.com/s2/favicons?domain=https://developers.ashbyhq.com&sz=128)Ashby+2](https://developers.ashbyhq.com/reference/jobcreate?utm_source=chatgpt.com)

LinkedIn’s current documentation says access is restricted to approved developers and that it is not accepting new Job Posting API partnerships. Indeed’s Job Sync API is designed for ATS partners and requires partner verification. [![](https://www.google.com/s2/favicons?domain=https://learn.microsoft.com&sz=128)Microsoft Learn+2![](https://www.google.com/s2/favicons?domain=https://docs.indeed.com&sz=128)Indeed Documentation+2](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview?view=li-lts-2026-03&utm_source=chatgpt.com)

## Recommended integration strategy

Create a common adapter:

```
TypeScript

interface JobBoardAdapter {
  name: string;

  validate(job: JobSpec): Promise<{
    valid: boolean;
    errors: string[];
  }>;

  publish(input: {
    jobId: string;
    idempotencyKey: string;
  }): Promise<{
    externalId: string;
    externalUrl?: string;
    status: "published" | "pending";
  }>;

  update(jobId: string): Promise<void>;
  close(jobId: string): Promise<void>;
}
```

Implement:

```

InternalPortalAdapter       real
GoogleIndexingAdapter       real
LeverAdapter                behind credentials
GreenhouseAdapter           behind credentials
AshbyAdapter                behind credentials
LinkedInDemoAdapter         simulated
IndeedDemoAdapter           simulated
```

Clearly label simulated results as **Demo integration**. Do not make the UI imply that a real LinkedIn or Indeed job was created.

* * *

# 8\. Scheduling design

Cal.com’s API can create bookings for an event type and accepts the candidate’s name, email, timezone and requested start time. [![](https://www.google.com/s2/favicons?domain=https://cal.com&sz=128)Cal](https://cal.com/docs/api-reference/v2/bookings/create-a-booking?utm_source=chatgpt.com)

However, I would not have the system silently select an interview time for a candidate.

Use this flow:

```

Strong fit approved
   ↓
Candidate receives Cal.com event link
   ↓
Candidate selects available slot
   ↓
Cal.com creates booking
   ↓
Cal.com webhook resumes workflow
   ↓
Application status becomes interview_scheduled
```

This still satisfies “schedule the first meeting” while avoiding arbitrary calendar allocation.

For a more automated demo:

1. Candidate provides three preferred time windows during application.

2. Workflow checks available slots.

3. Workflow selects the earliest overlapping slot.

4. Cal.com booking is created through the API.

5. Candidate receives the calendar invitation.


Direct Google Calendar creation is another option. Its API can insert events, invite attendees and request generation of a Google Meet conference. [![](https://www.google.com/s2/favicons?domain=https://developers.google.com&sz=128)Google for Developers](https://developers.google.com/workspace/calendar/api/guides/create-events?utm_source=chatgpt.com)

Because you already have Cal.com, it is the cleaner demo integration.

* * *

# 9\. Simplified admin access

For this interview demo, do not add an authentication provider. Ask for the admin email on the frontend and enforce a hardcoded allowlist in the backend:

```

Frontend asks for email
Backend allows protected operations only when the email is in the hardcoded allowlist
```

Hardcode the two allowed emails in the backend:

```
TypeScript

const ADMIN_EMAILS = new Set([\
  "adnaan@kgen.io",\
  "pritishmishra579@gmail.com",\
]);

if (!ADMIN_EMAILS.has(email)) {
  throw new Error("Forbidden");
}
```

This is intentionally a demo-only access gate, not authentication. Anyone who knows one of the allowed email addresses could impersonate that user, so every protected backend operation must perform the check.

The public candidate portal should not require authentication.

* * *

# 10\. Storage and database design

Store resume files in private object storage, not as Postgres byte arrays. Vercel Blob supports private stores. Vercel Functions have a server-upload request size limitation, so client uploads are preferable for potentially larger files. [![](https://www.google.com/s2/favicons?domain=https://vercel.com&sz=128)Vercel+2![](https://www.google.com/s2/favicons?domain=https://vercel.com&sz=128)Vercel+2](https://vercel.com/docs/vercel-blob?utm_source=chatgpt.com)

Suggested tables:

```

jobs
job_versions
rubrics
job_postings
applications
resume_extractions
candidate_profiles
evaluations
interviews
workflow_links
audit_events
```

## Important columns

### `jobs`

```

id
slug
title
status
current_version_id
current_rubric_id
created_by
created_at
published_at
```

### `job_versions`

```

id
job_id
version
source_prompt
job_spec_json
editor_json
rendered_html
model
prompt_version
created_at
```

### `job_postings`

```

id
job_id
provider
status
external_id
external_url
idempotency_key
last_error
published_at
closed_at
```

Add a unique constraint on:

```

(job_id, provider)
```

### `applications`

```

id
job_id
candidate_name
candidate_email
linkedin_url
resume_blob_key
resume_sha256
status
public_token
submitted_at
```

### `evaluations`

```

id
application_id
rubric_id
rubric_version
criteria_json
weighted_score
recommendation
summary
needs_human_review
model
prompt_version
created_at
```

### `interviews`

```

id
application_id
provider
external_booking_id
start_at
end_at
timezone
meeting_url
status
```

* * *

# 11\. Candidate-evaluation safeguards

Because this concerns hiring, present the AI output as a **recommendation**, not a final hiring decision.

For the demo:

- Never evaluate name, gender, age, photograph, religion, address, marital status or similar attributes.

- Exclude candidate name, email, phone number and address from the scoring prompt.

- Only score criteria approved in the rubric.

- Show the evidence supporting every score.

- Never fabricate missing experience.

- Send low-confidence evaluations to manual review.

- Do not automatically send rejection emails.

- Record rubric version, prompt version, model and evaluation timestamp.

- Allow HR to override the recommendation and record why.


A particularly good UI detail is:

```

AI recommendation: Strong fit

Backend experience          4/5
Evidence                    “Built Go services handling...”

TypeScript                   5/5
Evidence                    “Developed Next.js and Node...”

Database design              3/5
Evidence                    “Used PostgreSQL...”
Missing evidence             No evidence of schema migration ownership

Weighted score               81/100
Confidence                   Medium
```

This is much more credible than a colored tag with opaque reasoning.

* * *

# 12\. Recommended MVP boundary

## Build for real

- Email-gated admin operations with no authentication provider.

- Prompt-to-structured-JD generation.

- Tiptap manual editing.

- Rubric generation and editing.

- Internal careers portal.

- Google `JobPosting` structured data.

- Candidate application form.

- Private resume upload.

- PDF Inspector extraction.


- Structured candidate profile extraction.

- Evidence-backed scoring.

- HR review dashboard.

- Cal.com scheduling invitation.

- Cal.com webhook handling.

- Durable workflow run status.

- One deliberately failing workflow to demonstrate retry behaviour.


## Simulate

- LinkedIn posting.

- Indeed posting.

- Any provider for which you cannot obtain credentials.


## Stretch goals

- A real Lever, Greenhouse or Ashby adapter.

- Email notifications.

- Application status page.

- Duplicate candidate detection.

- Closing external postings.

- Cost and token usage dashboard.

- Re-evaluate candidates when the rubric changes.

- Bulk resume upload.


* * *

# 13\. Suggested project structure

```

src/
  app/
    admin/
      jobs/
      candidates/
      workflows/
    careers/
      [slug]/
    api/
      applications/
      bookings/webhook/
      workflows/

  components/
    jd-editor/
    rubric-editor/
    candidate-scorecard/
    publishing-status/

  db/
    schema/
    queries/

  ai/
    models.ts
    prompts/
      generate-job.ts
      generate-rubric.ts
      extract-profile.ts
      evaluate-candidate.ts
    schemas/
      job-spec.ts
      rubric.ts
      candidate-profile.ts
      evaluation.ts

  integrations/
    job-boards/
      adapter.ts
      internal.ts
      google-indexing.ts
      lever.ts
      greenhouse.ts
      ashby.ts
      linkedin-demo.ts
      indeed-demo.ts
    calendar/
      calcom.ts
    documents/
      pdf-inspector.ts

  workflows/
    publish-job.ts
    evaluate-application.ts
    schedule-interview.ts

  security/
    admin-allowlist.ts
    sanitize-resume.ts
```

* * *

# 14\. Best interview demo sequence

01. Enter an allowlisted email address.

02. Enter:

    `We need a backend engineer with 3+ years of Go, PostgreSQL and distributed systems experience. Bangalore hybrid.`

03. Show the structured JD appearing.

04. Edit one requirement manually.

05. Generate the scoring rubric.

06. Change one criterion’s weight.

07. Click Publish.

08. Show provider cards:
    - Careers portal: Published

    - Google indexing: Submitted

    - LinkedIn: Demo published

    - Indeed: Demo published
09. Open the public candidate portal.

10. Apply using a sample resume.

11. Open the workflow page and show:
    - Resume uploaded

    - PDF classified

    - Text extracted

    - Candidate profile generated

    - Rubric scored
12. Show criterion-level evidence.

13. Approve the scheduling invitation.

14. Book through Cal.com.

15. Show the workflow resuming and the candidate moving to `Interview scheduled`.


That demonstration covers AI, structured output, rich-text editing, integration architecture, durable execution, document processing, explainability and human oversight without relying on inaccessible production job-board APIs.

Sources

ChatGPT is AI and can make mistakes.

Voice
