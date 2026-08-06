import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { applications, auditEvents } from "@/db/schema";
import { requireAdmin } from "@/security/admin";

export async function POST(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const actor = await requireAdmin(); const { applicationId } = await params; const { decision, reason } = await request.json();
    if (decision !== "reject" || typeof reason !== "string" || reason.trim().length < 5) return Response.json({ error: "Provide a clear rejection reason." }, { status: 400 });
    const [application] = await getDb().update(applications).set({ status: "rejected" }).where(eq(applications.id, applicationId)).returning();
    if (!application) return Response.json({ error: "Application not found" }, { status: 404 });
    await getDb().insert(auditEvents).values({ entityType: "application", entityId: applicationId, action: "rejected_by_reviewer", actor, metadata: { reason: reason.trim(), previousRecommendation: application.recommendation } });
    return Response.json({ application });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Decision failed" }, { status: 400 }); }
}
