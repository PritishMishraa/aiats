import { z } from "zod";
import { getDb } from "@/db";
import { workspaceSettings } from "@/db/schema";
import { revalidateTag } from "next/cache";

const schema = z.object({ mode: z.enum(["approval", "agent"]) });

export async function POST(request: Request) {
  const result = schema.safeParse(await request.json());
  if (!result.success) return Response.json({ error: "Choose a valid workflow mode." }, { status: 400 });

  await getDb()
    .insert(workspaceSettings)
    .values({ id: "default", workflowMode: result.data.mode, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: workspaceSettings.id,
      set: { workflowMode: result.data.mode, updatedAt: new Date() },
    });
  revalidateTag("workflow-mode", { expire: 0 });
  return Response.json({ mode: result.data.mode });
}
