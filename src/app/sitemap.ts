import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const published = await getDb()
    .select({ slug: jobs.slug, updatedAt: jobs.updatedAt })
    .from(jobs)
    .where(eq(jobs.status, "published"));
  return [
    { url: `${base}/careers`, changeFrequency: "daily", priority: 0.8 },
    ...published.map((job) => ({
      url: `${base}/careers/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 1,
    })),
  ];
}
