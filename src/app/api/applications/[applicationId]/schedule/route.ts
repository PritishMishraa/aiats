import { scheduleInterview } from "@/lib/interview-scheduling";

export async function POST(_: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const { applicationId } = await params;
    return Response.json(await scheduleInterview(applicationId));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Interview scheduling failed" },
      { status: 500 },
    );
  }
}
