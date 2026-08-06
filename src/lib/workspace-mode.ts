import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { workspaceSettings } from "@/db/schema";

export type WorkflowMode = "approval" | "agent";

export async function getWorkflowMode(): Promise<WorkflowMode> {
  const [settings] = await getDb()
    .select({ workflowMode: workspaceSettings.workflowMode })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, "default"))
    .limit(1);

  return settings?.workflowMode === "approval" ? "approval" : "agent";
}
