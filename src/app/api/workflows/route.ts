import { getWorkflowRuns } from "@/lib/workflow-runs";

export async function GET() {
  return Response.json({ runs: await getWorkflowRuns() }, { headers: { "Cache-Control": "no-store" } });
}
