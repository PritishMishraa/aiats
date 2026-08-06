"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import type { WorkflowRunView } from "@/lib/workflow-runs";

export function WorkflowActiveCount({ value }: { value: number }) {
  const [active, setActive] = useState(value);

  useEffect(() => {
    function updateFromRuns(event: Event) {
      const runs = (event as CustomEvent<{ runs: WorkflowRunView[] }>).detail.runs;
      setActive(runs.filter((run) => run.active).length);
    }

    window.addEventListener("workflow-runs-updated", updateFromRuns);
    return () => window.removeEventListener("workflow-runs-updated", updateFromRuns);
  }, []);

  return <NumberFlow value={active} className="tabular-nums" />;
}
