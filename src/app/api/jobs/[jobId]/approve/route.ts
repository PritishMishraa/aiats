import { completeJobLifecycleStep, failJobLifecycleStep, startJobLifecycleStep } from "@/lib/job-workflow-tracking";
import { approveJob } from "@/lib/job-lifecycle";
import { revalidatePath } from "next/cache";

export const maxDuration = 60;

export async function POST(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const actor = "system";
  const { jobId } = await params;
  const tracking = await startJobLifecycleStep(
    jobId,
    "rubric",
    "Generate scoring rubric",
    "AI creates weighted evaluation criteria after approval.",
    2,
    "ai",
  );
  try {
    const result = await approveJob(jobId, actor);
    if (tracking) await completeJobLifecycleStep(tracking, "awaiting_publish", result.accounting);
    revalidatePath(`/admin/jobs/${jobId}`);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/workflows");
    return Response.json({ job: result.job });
  } catch (error) {
    console.error(error);
    if (tracking) await failJobLifecycleStep(tracking, error);
    return Response.json({ error: error instanceof Error ? error.message : "Approval failed" }, { status: 500 });
  }
}
