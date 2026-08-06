import { completeJobLifecycleStep, failJobLifecycleStep, startJobLifecycleStep } from "@/lib/job-workflow-tracking";
import { publishJob } from "@/lib/job-lifecycle";
export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  let tracking: Awaited<ReturnType<typeof startJobLifecycleStep>> = null;
  try {
    tracking = await startJobLifecycleStep(
      jobId,
      "publish",
      "Publish job",
      "Publish the approved role to configured job channels.",
      3,
    );
    const results = await publishJob(jobId);
    if (tracking) await completeJobLifecycleStep(tracking, "completed");
    return Response.json({ results });
  } catch (error) {
    if (tracking) await failJobLifecycleStep(tracking, error);
    return Response.json({ error: error instanceof Error ? error.message : "Publishing failed" }, { status: 500 });
  }
}
