import { cache, Suspense } from "react";
import { AiCost } from "@/components/ai-cost";
import { WorkflowList } from "@/components/workflow-list";
import { Skeleton } from "@/components/ui/skeleton";
import { getWorkflowRuns as getWorkflowRunsUncached } from "@/lib/workflow-runs";

const getWorkflowRuns = cache(getWorkflowRunsUncached);

async function WorkflowContent() {
  const runs = await getWorkflowRuns();
  return <WorkflowList initialRuns={runs} />;
}

function WorkflowSummary({ active, cost }: { active: number; cost: number }) {
  return (
    <div className="flex shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]">
      <div className="min-w-24 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Running</p>
        <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-slate-900">{active}</p>
      </div>
      <div className="w-px bg-slate-100" />
      <div className="min-w-28 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">AI cost</p>
        <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-slate-900">
          <AiCost value={cost} />
        </p>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Durable execution</p>
          <h1 className="mt-1 text-2xl font-semibold">Workflows</h1>
          <p className="mt-1 text-sm text-slate-500">
            Job creation and candidate evaluation steps, progress, and AI cost in real time.
          </p>
        </div>
        <WorkflowSummaryPlaceholder />
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-xl bg-white" />}>
        <WorkflowContent />
      </Suspense>
    </div>
  );
}

function WorkflowSummaryPlaceholder() {
  return (
    <Suspense fallback={<Skeleton className="h-[68px] w-56 rounded-xl bg-white" />}>
      <WorkflowSummaryContent />
    </Suspense>
  );
}

async function WorkflowSummaryContent() {
  const runs = await getWorkflowRuns();
  const active = runs.filter((run) => run.active).length;
  const cost = runs.flatMap((run) => run.steps).reduce((sum, step) => sum + (step.costUsd ?? 0), 0);
  return <WorkflowSummary active={active} cost={cost} />;
}
