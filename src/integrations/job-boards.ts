import type { JobSpec } from "@/ai/schemas";
export type PostingResult = {
  provider: string;
  status: "published" | "failed";
  externalId?: string;
  externalUrl?: string;
  demo: boolean;
  error?: string;
};
export async function publishInternal(job: {
  id: string;
  slug: string;
}): Promise<PostingResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    provider: "Internal careers",
    status: "published",
    externalId: job.id,
    externalUrl: `${base}/careers/${job.slug}`,
    demo: false,
  };
}
export async function publishDemo(
  provider: string,
  job: { id: string },
): Promise<PostingResult> {
  return {
    provider,
    status: "published",
    externalId: `demo_${provider.toLowerCase()}_${job.id.slice(0, 8)}`,
    demo: true,
  };
}
export async function publishGoogle(job: {
  id: string;
  slug: string;
}): Promise<PostingResult> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return {
    provider: "Google Jobs structured data",
    status: "published",
    externalId: job.id,
    externalUrl: `${base}/careers/${job.slug}`,
    demo: false,
  };
}
export async function publishLever(job: {
  id: string;
  spec: JobSpec;
}): Promise<PostingResult> {
  void job;
  if (!process.env.LEVER_API_KEY)
    return {
      provider: "Lever",
      status: "failed",
      demo: false,
      error: "LEVER_API_KEY is not configured",
    };
  return {
    provider: "Lever",
    status: "failed",
    demo: false,
    error: "Lever account mapping is not configured",
  };
}
