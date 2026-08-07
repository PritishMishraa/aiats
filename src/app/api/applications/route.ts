import { createHash, randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { getDb } from "@/db";
import { applications, jobs } from "@/db/schema";
import { durableEvaluationWorkflow as evaluateApplicationWorkflow } from "@/workflows/durable-evaluation";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const jobId = String(form.get("jobId") ?? "");
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const linkedinUrl = String(form.get("linkedinUrl") ?? "").trim() || null;
    const resume = form.get("resume");

    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !(resume instanceof File)) {
      return Response.json({ error: "Name, valid email, and resume are required." }, { status: 400 });
    }
    if (resume.type !== "application/pdf" || resume.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Resume must be a PDF no larger than 5 MB." }, { status: 400 });
    }

    const [job] = await getDb().select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job || job.status !== "published" || !job.rubric) {
      return Response.json({ error: "This role is not accepting applications." }, { status: 409 });
    }

    const bytes = Buffer.from(await resume.arrayBuffer());
    const sha = createHash("sha256").update(bytes).digest("hex");
    const blob = await put(`resumes/${job.id}/${randomUUID()}.pdf`, bytes, {
      access: "private",
      contentType: "application/pdf",
    });
    const [application] = await getDb()
      .insert(applications)
      .values({
        jobId,
        candidateName: name,
        candidateEmail: email,
        linkedinUrl,
        consent: true,
        resumeUrl: blob.url,
        resumeName: resume.name,
        resumeSha256: sha,
      })
      .returning();
    const run = await start(evaluateApplicationWorkflow, [application.id]);
    await getDb().update(applications).set({ workflowRunId: run.runId }).where(eq(applications.id, application.id));

    revalidatePath("/admin/candidates");
    revalidatePath(`/admin/jobs/${jobId}`);
    revalidatePath("/admin/workflows");

    return Response.json(
      { applicationId: application.id, runId: run.runId },
      { status: 201 },
    );
  } catch (error) {
    console.error("application submission failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Application failed" }, { status: 500 });
  }
}
