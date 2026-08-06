import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { AiCost as AnimatedAiCost } from "@/components/ai-cost";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { workflowSteps } from "@/db/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkflowMode } from "@/lib/workspace-mode";
import { cacheLife, cacheTag } from "next/cache";

async function AllTimeAiCost() {
  const [workflowCost] = await getDb()
    .select({ total: sql<number>`coalesce(sum(${workflowSteps.costUsd}), 0)` })
    .from(workflowSteps);
  const totalAiCost = Number(workflowCost?.total ?? 0);

  return <AnimatedAiCost value={totalAiCost} />;
}

async function getShellWorkflowMode() {
  "use cache";
  cacheLife("minutes");
  cacheTag("workflow-mode");
  return getWorkflowMode();
}

function AiCostFallback() {
  return <Skeleton className="h-7 w-24 bg-slate-700" />;
}

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const initialMode = await getShellWorkflowMode();
  return (
    <AppShell
      initialMode={initialMode}
      aiCost={
        <Suspense fallback={<AiCostFallback />}>
          <AllTimeAiCost />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
