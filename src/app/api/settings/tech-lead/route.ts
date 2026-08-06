import { z } from "zod";
import { getDb } from "@/db";
import { workspaceSettings } from "@/db/schema";

const schema = z.object({ techLeadEmail: z.string().trim().email("Enter a valid tech lead email address") });

export async function POST(request: Request) {
  try {
    const result = schema.safeParse(await request.json());
    if (!result.success) return Response.json({ error: result.error.issues[0]?.message ?? "Invalid email" }, { status: 400 });

    await getDb()
      .insert(workspaceSettings)
      .values({ id: "default", techLeadEmail: result.data.techLeadEmail, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: workspaceSettings.id,
        set: { techLeadEmail: result.data.techLeadEmail, updatedAt: new Date() },
      });
    return Response.json({ techLeadEmail: result.data.techLeadEmail });
  } catch {
    return Response.json({ error: "Unable to save the tech lead email" }, { status: 500 });
  }
}
