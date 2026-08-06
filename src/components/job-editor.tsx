"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { JobSpec } from "@/ai/schemas";
import { Button } from "@/components/ui/button";

export function JobEditor({ jobId, spec }: { jobId: string; spec: JobSpec }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: spec.title,
    summary: spec.summary,
    responsibilities: spec.responsibilities.join("\n"),
    requiredQualifications: spec.requiredQualifications.join("\n"),
    preferredQualifications: spec.preferredQualifications.join("\n"),
  });
  async function save() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        responsibilities: lines(form.responsibilities),
        requiredQualifications: lines(form.requiredQualifications),
        preferredQualifications: lines(form.preferredQualifications),
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return setError(data.error);
    setEditing(false);
    router.refresh();
  }
  if (!editing)
    return (
      <Button
        variant="outline"
        onClick={() => setEditing(true)}
        className="h-10 px-4"
      >
        Edit draft
      </Button>
    );
  return (
    <div className="w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:min-w-[520px]">
      <p className="text-xs font-semibold">Refine job details</p>
      <label className="block text-[11px] text-slate-500">
        Title
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-950"
        />
      </label>
      <label className="block text-[11px] text-slate-500">
        Summary
        <textarea
          value={form.summary}
          onChange={(e) => setForm({ ...form, summary: e.target.value })}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-950"
        />
      </label>
      {(
        [
          "responsibilities",
          "requiredQualifications",
          "preferredQualifications",
        ] as const
      ).map((key) => (
        <label
          key={key}
          className="block text-[11px] capitalize text-slate-500"
        >
          {key.replace(/([A-Z])/g, " $1")} · one per line
          <textarea
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm text-slate-950"
          />
        </label>
      ))}
      <p className="text-[10px] text-amber-700">
        Saving changes invalidates the existing rubric so it can be regenerated
        from the approved requirements.
      </p>
      <div className="flex gap-2">
        <Button
          onClick={save}
          disabled={saving}
          className="bg-slate-950 text-white"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
