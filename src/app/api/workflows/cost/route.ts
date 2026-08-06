import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { workflowSteps } from "@/db/schema";

export async function GET() {
  const [workflowCost] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${workflowSteps.costUsd}), 0)` })
    .from(workflowSteps);

  return Response.json(
    { total: Number(workflowCost?.total ?? 0) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
