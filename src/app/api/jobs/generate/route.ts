import { desc, eq, inArray } from "drizzle-orm";
import { start } from "workflow/api";
import { getDb } from "@/db";
import { jobGenerationRuns } from "@/db/schema";
import { jobGenerationWorkflow } from "@/workflows/job-generation";

export const maxDuration = 60;
function serialize(run: typeof jobGenerationRuns.$inferSelect) {
  return { ...run, createdAt: run.createdAt.toISOString(), updatedAt: run.updatedAt.toISOString(), completedAt: run.completedAt?.toISOString() ?? null };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const active = url.searchParams.get("active") === "1";
  const where = id ? eq(jobGenerationRuns.id, id) : active ? inArray(jobGenerationRuns.status, ["queued", "running"]) : undefined;
  const [run] = await getDb().select().from(jobGenerationRuns).where(where).orderBy(desc(jobGenerationRuns.createdAt)).limit(1);
  return Response.json({ run: run ? serialize(run) : null }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();
    if (typeof prompt !== "string" || prompt.trim().length < 20) return Response.json({ error: "Please describe the role in at least 20 characters." }, { status: 400 });
    const actor = "system";
    const [generation] = await getDb().insert(jobGenerationRuns).values({ prompt: prompt.trim(), createdBy: actor }).returning();
    const run = await start(jobGenerationWorkflow, [generation.id, generation.prompt, actor]);
    const [updated] = await getDb().update(jobGenerationRuns).set({ workflowRunId: run.runId, updatedAt: new Date() }).where(eq(jobGenerationRuns.id, generation.id)).returning();
    return Response.json({ run: serialize(updated) }, { status: 202 });
  } catch (error) {
    console.error("job generation failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}
