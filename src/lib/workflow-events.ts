import { getWritable } from "workflow";
import type { JobSpec } from "@/ai/schemas";

export type WorkflowChangeEvent =
  | {
      type: "workflow-changed";
      occurredAt: string;
    }
  | {
      type: "job-draft";
      occurredAt: string;
      jobGenerationId: string;
      draft: Partial<JobSpec>;
    };

async function emitWorkflowEvent(event: WorkflowChangeEvent) {
  const writable = getWritable<WorkflowChangeEvent>({ namespace: "progress" });
  const writer = writable.getWriter();

  try {
    await writer.write(event);
  } catch (error) {
    // UI notifications must never make an otherwise successful durable step fail.
    console.warn("workflow progress event failed", error);
  } finally {
    writer.releaseLock();
  }
}

export function emitWorkflowChanged() {
  return emitWorkflowEvent({ type: "workflow-changed", occurredAt: new Date().toISOString() });
}

export function emitJobDraftChanged(jobGenerationId: string, draft: Partial<JobSpec>) {
  return emitWorkflowEvent({
    type: "job-draft",
    occurredAt: new Date().toISOString(),
    jobGenerationId,
    draft,
  });
}
