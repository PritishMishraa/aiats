import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["@firecrawl/pdf-inspector"],
};

export default withWorkflow(nextConfig);
