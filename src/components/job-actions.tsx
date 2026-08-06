"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function JobActions({ jobId, approved, published }: { jobId: string; approved: boolean; published: boolean }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"approve" | "publish" | null>(null);
  const [error, setError] = useState("");

  async function act(action: "approve" | "publish") {
    setPendingAction(action);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/${action}`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) return setError(data.error ?? `Unable to ${action} this job.`);
      router.refresh();
    } catch {
      setError(`Unable to ${action} this job. Check your connection and try again.`);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex gap-2">
        {!approved ? (
          <Button
            onClick={() => act("approve")}
            disabled={pendingAction !== null}
            aria-busy={pendingAction === "approve"}
            className="h-10 bg-violet-600 px-4 text-white hover:bg-violet-500"
          >
            {pendingAction === "approve" ? (
              <>
                <Spinner aria-hidden="true" /> Generating rubric…
              </>
            ) : (
              "Approve & generate rubric"
            )}
          </Button>
        ) : !published ? (
          <Button
            onClick={() => act("publish")}
            disabled={pendingAction !== null}
            aria-busy={pendingAction === "publish"}
            className="h-10 bg-slate-950 px-4 text-white"
          >
            {pendingAction === "publish" ? (
              <>
                <Spinner aria-hidden="true" /> Publishing…
              </>
            ) : (
              "Publish job"
            )}
          </Button>
        ) : (
          <span className="inline-flex h-10 items-center rounded-lg bg-emerald-50 px-4 text-xs font-semibold text-emerald-700">
            Published
          </span>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
