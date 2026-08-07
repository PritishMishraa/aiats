import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { applications, auditEvents, interviews, workflowSteps } from "@/db/schema";

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const actor = "system";
    const { applicationId } = await params;
    const { decision, reason } = await request.json();
    if (decision !== "reject" || typeof reason !== "string" || reason.trim().length < 5) {
      return Response.json({ error: "Provide a clear rejection reason." }, { status: 400 });
    }

    const [[existingApplication], [interview]] = await Promise.all([
      getDb().select({ status: applications.status }).from(applications).where(eq(applications.id, applicationId)).limit(1),
      getDb()
        .select({ status: interviews.status })
        .from(interviews)
        .where(eq(interviews.applicationId, applicationId))
        .limit(1),
    ]);
    if (!existingApplication) return Response.json({ error: "Application not found" }, { status: 404 });
    if (existingApplication.status === "interview_scheduled" || interview?.status === "scheduled") {
      return Response.json({ error: "A scheduled interview cannot be rejected." }, { status: 409 });
    }

    const completedAt = new Date();
    const [application] = await getDb()
      .update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.id, applicationId))
      .returning();
    if (!application) return Response.json({ error: "Application not found" }, { status: 404 });

    await Promise.all([
      getDb()
        .update(workflowSteps)
        .set({
          status: "completed",
          description: "Candidate was rejected, so no interview was scheduled.",
          completedAt,
          error: null,
        })
        .where(and(eq(workflowSteps.applicationId, applicationId), eq(workflowSteps.key, "schedule"))),
      getDb()
        .insert(auditEvents)
        .values({
          entityType: "application",
          entityId: applicationId,
          action: "rejected_by_reviewer",
          actor,
          metadata: { reason: reason.trim(), previousRecommendation: application.recommendation },
        }),
    ]);

    revalidatePath(`/admin/candidates/${applicationId}`);
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/workflows");
    return Response.json({ application });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Decision failed" }, { status: 400 });
  }
}
