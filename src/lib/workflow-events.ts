import { getWritable } from "workflow";

export type WorkflowChangeEvent = {
  type: "workflow-changed";
  occurredAt: string;
};

export async function emitWorkflowChanged() {
  const writable = getWritable<WorkflowChangeEvent>({ namespace: "progress" });
  const writer = writable.getWriter();

  try {
    await writer.write({ type: "workflow-changed", occurredAt: new Date().toISOString() });
  } catch (error) {
    // UI notifications must never make an otherwise successful durable step fail.
    console.warn("workflow progress event failed", error);
  } finally {
    writer.releaseLock();
  }
}
