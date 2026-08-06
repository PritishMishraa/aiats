"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function CandidateActions({
  applicationId,
  invited,
}: {
  applicationId: string;
  invited: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function invite() {
    setLoading(true);
    const response = await fetch(`/api/applications/${applicationId}/invite`, {
      method: "POST",
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error);
    router.refresh();
  }
  async function reject() {
    const reason = window.prompt(
      "Reason for rejection (saved to the audit log)",
    );
    if (!reason) return;
    setLoading(true);
    const response = await fetch(
      `/api/applications/${applicationId}/decision`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "reject", reason }),
      },
    );
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      {!invited ? (
        <Button
          onClick={invite}
          disabled={loading}
          className="h-10 bg-slate-950 px-4 text-white"
        >
          {loading ? "Working…" : "Approve interview invitation"}
        </Button>
      ) : (
        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          Invitation ready
        </span>
      )}
      <Button
        variant="outline"
        onClick={reject}
        disabled={loading}
        className="h-10 text-red-700"
      >
        Reject
      </Button>
      {error ? <p className="w-full text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
