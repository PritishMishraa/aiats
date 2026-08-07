"use client";

import Link from "next/link";
import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";
import { CaretDown, Check, Cpu, Robot, WarningCircle } from "@phosphor-icons/react";
import type { WorkflowRunView } from "@/lib/workflow-runs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";

function money(value: number) {
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

const LIVE_ELAPSED_REFRESH_MS = 100;
const ACTIVE_RUNS_REFRESH_MS = 5_000;
const IDLE_RUNS_REFRESH_MS = 15_000;
const MILLISECOND_FORMAT = { maximumFractionDigits: 0 } satisfies Intl.NumberFormatOptions;
const SECOND_FORMAT = {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} satisfies Intl.NumberFormatOptions;

function ElapsedTime({ startedAt, completedAt }: { startedAt: string; completedAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (completedAt) return;

    const interval = window.setInterval(() => setNow(Date.now()), LIVE_ELAPSED_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [completedAt]);

  const milliseconds = Math.max(0, new Date(completedAt ?? now).getTime() - new Date(startedAt).getTime());
  const showSeconds = milliseconds >= 1000;

  return (
    <NumberFlow
      key={showSeconds ? "seconds" : "milliseconds"}
      value={showSeconds ? milliseconds / 1000 : milliseconds}
      format={showSeconds ? SECOND_FORMAT : MILLISECOND_FORMAT}
      suffix={showSeconds ? "s" : "ms"}
      willChange={!completedAt}
      suppressHydrationWarning
      className="tabular-nums"
    />
  );
}

function AiStepTime({
  status,
  startedAt,
  completedAt,
}: {
  status: string;
  startedAt: string;
  completedAt: string | null;
}) {
  if (status === "pending") return "Pending";
  if (status === "running") return <ElapsedTime startedAt={startedAt} completedAt={null} />;
  if (!completedAt) return "—";
  return <ElapsedTime startedAt={startedAt} completedAt={completedAt} />;
}
function systemStepTime(status: string, completedAt: string | null) {
  if (status === "pending") return "Pending";
  if (status === "running") return "In progress";
  if (!completedAt) return "—";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(
    new Date(completedAt),
  );
}

function RunCard({ run, defaultOpen }: { run: WorkflowRunView; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const failed = run.status === "failed";
  const waiting = run.waiting;
  const totalCost = run.steps.reduce((sum, step) => sum + (step.costUsd ?? 0), 0);
  const completed = run.steps.filter((step) => step.status === "completed").length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.03)]"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-4 p-5 text-left hover:bg-slate-50/70">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${failed ? "bg-red-50 text-red-600" : run.active ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"}`}
        >
          {failed ? (
            <WarningCircle size={19} weight="fill" />
          ) : run.active ? (
            <Spinner className="size-[18px]" />
          ) : (
            <Check size={18} weight="bold" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{run.title}</span>
          <span className="mt-1 block truncate text-xs text-slate-400">
            {run.subtitle} · {completed} step{completed === 1 ? "" : "s"} completed
          </span>
        </span>
        {totalCost > 0 ? (
          <span className="hidden items-center gap-1 text-xs font-medium tabular-nums text-slate-500 sm:flex">
            {money(totalCost)}
          </span>
        ) : null}
        <Badge
          variant="outline"
          className={
            run.active
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : waiting
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : failed
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }
        >
          {run.active ? "Running" : waiting ? "Waiting" : failed ? "Failed" : "Completed"}
        </Badge>
        <CaretDown className="text-slate-400 transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="font-mono">Run {run.runId}</span>
            <Link href={run.detailHref} className="font-medium text-slate-600 hover:text-slate-950">
              {run.detailLabel} →
            </Link>
          </div>
          <ol className="relative ml-2">
            {run.steps.map((step, index) => {
              const hasNextStep =
                index < run.steps.length - 1 ||
                (run.active && !run.steps.some((currentStep) => currentStep.status === "running"));

              return (
                <li key={step.id} className="relative pb-5 pl-7 last:pb-1">
                  {hasNextStep ? (
                    <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 border-l border-slate-200" />
                  ) : null}
                  <span
                    className={`absolute -left-[10px] top-0 grid size-5 place-items-center rounded-full ring-4 ring-white ${step.status === "failed" ? "bg-red-100 text-red-600" : step.status === "running" ? "bg-violet-100 text-violet-600" : step.status === "pending" ? "bg-slate-100 text-slate-400" : "bg-emerald-100 text-emerald-600"}`}
                  >
                    {step.status === "running" ? (
                      <Spinner className="size-3" />
                    ) : step.status === "failed" ? (
                      <WarningCircle size={12} weight="fill" />
                    ) : step.status === "pending" ? (
                      <span className="size-1.5 rounded-full bg-current" />
                    ) : (
                      <Check size={11} weight="bold" />
                    )}
                  </span>
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">{step.title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">{step.error ?? step.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] tabular-nums text-slate-400">
                      {step.kind === "ai" ? (
                        <span className="flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 font-medium text-violet-700">
                          <Robot size={13} /> AI
                        </span>
                      ) : (
                        <Cpu size={13} />
                      )}
                      {step.costUsd != null ? (
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700">
                          {money(step.costUsd)}
                        </span>
                      ) : null}
                      <span suppressHydrationWarning>
                        {step.kind === "ai" ? (
                          <AiStepTime status={step.status} startedAt={step.startedAt} completedAt={step.completedAt} />
                        ) : (
                          systemStepTime(step.status, step.completedAt)
                        )}
                      </span>
                    </div>
                  </div>
                  {step.kind === "ai" && (step.inputTokens != null || step.outputTokens != null) ? (
                    <p className="mt-2 text-[10px] tabular-nums text-slate-400">
                      {(step.inputTokens ?? 0).toLocaleString()} input · {(step.outputTokens ?? 0).toLocaleString()}{" "}
                      output tokens · {step.model}
                    </p>
                  ) : null}
                </li>
              );
            })}
            {run.active && !run.steps.some((step) => step.status === "running") ? (
              <li className="relative pl-7">
                <span className="absolute -left-[10px] top-0 grid size-5 place-items-center rounded-full bg-violet-100 text-violet-600 ring-4 ring-white">
                  <Spinner className="size-3" />
                </span>
                <p className="text-xs font-semibold text-slate-700">Starting next step…</p>
              </li>
            ) : null}
          </ol>
          {failed && run.failureReason ? (
            <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{run.failureReason}</div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function WorkflowList({ initialRuns }: { initialRuns: WorkflowRunView[] }) {
  const [runs, setRuns] = useState(initialRuns);
  const refreshing = useRef(false);
  const refreshQueued = useRef(false);
  const activeRunIds = runs
    .filter((run) => run.active)
    .map((run) => run.runId)
    .join(",");
  const hasMonitoredRuns = runs.some((run) => run.active || run.waiting);

  useEffect(() => {
    async function refresh() {
      if (refreshing.current) {
        refreshQueued.current = true;
        return;
      }

      refreshing.current = true;
      try {
        const response = await fetch("/api/workflows", { cache: "no-store" });
        if (!response.ok) return;
        const nextRuns = (await response.json()).runs as WorkflowRunView[];
        setRuns(nextRuns);
        window.dispatchEvent(new CustomEvent("workflow-runs-updated", { detail: { runs: nextRuns } }));
      } catch {
        // Keep the latest visible state while EventSource reconnects.
      } finally {
        refreshing.current = false;
        if (refreshQueued.current) {
          refreshQueued.current = false;
          void refresh();
        }
      }
    }

    const sources = activeRunIds
      .split(",")
      .filter(Boolean)
      .map((runId) => {
        const source = new EventSource(`/api/workflows/${encodeURIComponent(runId)}/events`);
        source.onopen = () => void refresh();
        source.onmessage = () => void refresh();
        return source;
      });

    void refresh();
    const poll = window.setInterval(refresh, hasMonitoredRuns ? ACTIVE_RUNS_REFRESH_MS : IDLE_RUNS_REFRESH_MS);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      sources.forEach((source) => source.close());
      window.clearInterval(poll);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [activeRunIds, hasMonitoredRuns]);

  if (!runs.length)
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
        Workflow runs appear here after candidates apply.
      </div>
    );
  return (
    <div className="space-y-3" aria-live="polite">
      {runs.map((run, index) => (
        <RunCard key={`${run.type}-${run.id}`} run={run} defaultOpen={run.active || index === 0} />
      ))}
    </div>
  );
}
