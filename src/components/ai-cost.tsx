"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import type { WorkflowRunView } from "@/lib/workflow-runs";

export function AiCost({ value }: { value: number }) {
  const [liveValue, setLiveValue] = useState(value);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const response = await fetch("/api/workflows/cost", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { total: number };
        if (!cancelled) setLiveValue(data.total);
      } catch {
        // Keep the last known total during transient network errors.
      }
    }

    function updateFromRuns(event: Event) {
      const runs = (event as CustomEvent<{ runs: WorkflowRunView[] }>).detail.runs;
      setLiveValue(runs.flatMap((run) => run.steps).reduce((sum, step) => sum + (step.costUsd ?? 0), 0));
    }

    window.addEventListener("workflow-runs-updated", updateFromRuns);
    void refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("workflow-runs-updated", updateFromRuns);
    };
  }, []);

  return (
    <NumberFlow
      value={liveValue}
      format={{
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }}
      className="tabular-nums"
    />
  );
}
