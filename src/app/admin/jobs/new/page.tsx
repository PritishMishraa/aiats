import { JobCreationWorkspace } from "@/components/job-creation/job-creation-workspace";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ generation?: string | string[] }>;
}) {
  const { generation } = await searchParams;
  const generationId = Array.isArray(generation) ? generation[0] : generation;

  return <JobCreationWorkspace key={generationId ?? "new"} resumeGenerationId={generationId ?? null} />;
}
