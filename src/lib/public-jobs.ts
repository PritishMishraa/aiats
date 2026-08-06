import { desc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";

export const PUBLIC_JOBS_CACHE_TAG = "public-jobs";

export async function getPublishedJobs() {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_JOBS_CACHE_TAG);

  return getDb().select().from(jobs).where(eq(jobs.status, "published")).orderBy(desc(jobs.publishedAt));
}

export async function getPublishedJob(slug: string) {
  "use cache";
  cacheLife("max");
  cacheTag(PUBLIC_JOBS_CACHE_TAG);

  const [job] = await getDb().select().from(jobs).where(eq(jobs.slug, slug)).limit(1);

  return job?.status === "published" ? job : null;
}
