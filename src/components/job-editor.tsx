"use client";

import { useMemo, useState, type FormEvent } from "react";
import { PencilSimple, WarningCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { JobSpec } from "@/ai/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

type EditorForm = {
  title: string;
  summary: string;
  responsibilities: string;
  requiredQualifications: string;
  preferredQualifications: string;
};

const listFields = [
  {
    key: "responsibilities",
    label: "Responsibilities",
    hint: "Add at least 3 responsibilities, one per line.",
    placeholder:
      "Build and maintain reliable services\nCollaborate with product and design\nImprove engineering quality",
  },
  {
    key: "requiredQualifications",
    label: "Required qualifications",
    hint: "Only include requirements that are essential for the role.",
    placeholder: "3+ years of relevant experience\nStrong written communication skills",
  },
  {
    key: "preferredQualifications",
    label: "Preferred qualifications",
    hint: "Optional — add nice-to-have experience, one per line.",
    placeholder: "Experience in an early-stage team",
  },
] as const;

function formFromSpec(spec: JobSpec): EditorForm {
  return {
    title: spec.title,
    summary: spec.summary,
    responsibilities: spec.responsibilities.join("\n"),
    requiredQualifications: spec.requiredQualifications.join("\n"),
    preferredQualifications: spec.preferredQualifications.join("\n"),
  };
}

export function JobEditor({ jobId, spec, hasRubric }: { jobId: string; spec: JobSpec; hasRubric: boolean }) {
  const router = useRouter();
  const initialForm = useMemo(() => formFromSpec(spec), [spec]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<EditorForm>(initialForm);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  function update(key: keyof EditorForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError("");
  }

  function requestClose() {
    if (saving) return;
    if (isDirty && !window.confirm("Discard your unsaved changes?")) return;
    setForm(initialForm);
    setError("");
    setOpen(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setForm(initialForm);
      setError("");
      setOpen(true);
      return;
    }
    requestClose();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const responsibilities = lines(form.responsibilities);
    const requiredQualifications = lines(form.requiredQualifications);

    if (form.title.trim().length < 2) {
      setError("Enter a job title with at least 2 characters.");
      return;
    }
    if (responsibilities.length < 3) {
      setError("Add at least 3 responsibilities, one per line.");
      return;
    }
    if (requiredQualifications.length < 1) {
      setError("Add at least 1 required qualification.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          summary: form.summary.trim(),
          responsibilities,
          requiredQualifications,
          preferredQualifications: lines(form.preferredQualifications),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not save the job description.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save the job description. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={() => handleOpenChange(true)} className="h-10 gap-2 px-4">
        <PencilSimple aria-hidden="true" />
        Edit job
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-1rem)] gap-0 overflow-hidden rounded-2xl bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,.2),0_0_0_1px_rgba(15,23,42,.08)] sm:max-w-2xl"
        >
          <form onSubmit={save} className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
            <DialogHeader className="shrink-0 border-b border-slate-100 px-5 py-4 pr-14 sm:px-6 sm:py-5">
              <DialogTitle className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                Edit job description
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Make the role clear and easy for candidates to scan.
              </DialogDescription>
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={requestClose}
                aria-label="Close editor"
                className="absolute right-3 top-3 size-10 text-slate-500"
              >
                <span aria-hidden="true" className="text-xl font-light leading-none">
                  ×
                </span>
              </Button>
            </DialogHeader>

            <div className="min-h-0 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="job-title">Job title</Label>
                <Input
                  id="job-title"
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  className="h-11 rounded-lg bg-white px-3 text-sm md:text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-summary">Role summary</Label>
                <Textarea
                  id="job-summary"
                  value={form.summary}
                  onChange={(event) => update("summary", event.target.value)}
                  rows={4}
                  placeholder="Briefly explain the role, team, and impact."
                  className="min-h-28 resize-y rounded-lg bg-white px-3 py-2.5 text-sm leading-6 md:text-sm"
                />
                <p className="text-[11px] text-slate-500">A short paragraph covering the team, purpose, and impact.</p>
              </div>

              <div className="space-y-5 border-t border-slate-100 pt-5">
                {listFields.map(({ key, label, hint, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`job-${key}`}>{label}</Label>
                    <Textarea
                      id={`job-${key}`}
                      value={form[key]}
                      onChange={(event) => update(key, event.target.value)}
                      rows={4}
                      placeholder={placeholder}
                      className="min-h-28 resize-y rounded-lg bg-white px-3 py-2.5 text-sm leading-6 md:text-sm"
                    />
                    <p className="text-[11px] text-slate-500">{hint}</p>
                  </div>
                ))}
              </div>

              {hasRubric ? (
                <div className="flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-5 text-amber-900">
                  <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" aria-hidden="true" />
                  <p>Saving changes resets the current scoring rubric. You’ll need to approve the job again.</p>
                </div>
              ) : null}

              {error ? (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  {error}
                </p>
              ) : null}
            </div>

            <DialogFooter className="shrink-0 flex-row items-center justify-end border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
              <Button
                type="button"
                variant="ghost"
                onClick={requestClose}
                disabled={saving}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !isDirty}
                aria-busy={saving}
                className="h-10 min-w-28 bg-slate-950 px-4 text-white hover:bg-slate-800"
              >
                {saving ? (
                  <>
                    <Spinner aria-hidden="true" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
