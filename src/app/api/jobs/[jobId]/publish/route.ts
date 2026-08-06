import { completeJobLifecycleStep, failJobLifecycleStep, startJobLifecycleStep } from "@/lib/job-workflow-tracking";
import { publishJob } from "@/lib/job-lifecycle";
import { revalidatePath } from "next/cache";
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
    revalidatePath(`/admin/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/workflows");
    revalidatePath("/careers");
    return Response.json({ results });
  } catch (error) {
    if (tracking) await failJobLifecycleStep(tracking, error);
    return Response.json({ error: error instanceof Error ? error.message : "Publishing failed" }, { status: 500 });
  }
}
