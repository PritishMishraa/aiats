import { getRun } from "workflow/api";
import type { WorkflowChangeEvent } from "@/lib/workflow-events";

export const maxDuration = 300;

export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getRun(runId);

  if (!(await run.exists)) return Response.json({ error: "Workflow run not found" }, { status: 404 });

  const lastEventIdHeader = request.headers.get("last-event-id");
  const lastEventId = lastEventIdHeader === null ? Number.NaN : Number(lastEventIdHeader);
  const probe = run.getReadable<WorkflowChangeEvent>({ namespace: "progress" });
  const startIndex =
    Number.isSafeInteger(lastEventId) && lastEventId >= 0 ? lastEventId + 1 : (await probe.getTailIndex()) + 1;
  let index = startIndex;
  const encoder = new TextEncoder();
  const sse = new TransformStream<WorkflowChangeEvent, Uint8Array>({
    transform(event, controller) {
      controller.enqueue(encoder.encode(`id: ${index++}\ndata: ${JSON.stringify(event)}\n\n`));
    },
  });

  return new Response(run.getReadable<WorkflowChangeEvent>({ namespace: "progress", startIndex }).pipeThrough(sse), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
