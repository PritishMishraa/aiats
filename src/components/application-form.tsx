"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle, FilePdf, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
export function ApplicationForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resumeName, setResumeName] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const data = await response.json();
      if (!response.ok) return setError(data.error ?? "Unable to submit your application.");
      setToken(data.publicToken);
    } catch {
      setError("Unable to submit your application. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }
  if (token)
    return (
      <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900">
        <CheckCircle size={24} weight="fill" />
        <h2 className="mt-3 text-sm font-semibold">Application received</h2>
        <p className="mt-2 text-xs leading-5 text-emerald-700">
          Your resume is being processed. Save the private status link below.
        </p>
        <a href="/admin/workflows" className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold underline">
          View application workflow
        </a>
      </div>
    );
  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,.08),0_0_0_1px_rgba(15,23,42,.06)]"
    >
      <input type="hidden" name="jobId" value={jobId} />
      <div>
        <label className="text-[11px] font-semibold" htmlFor="name">
          Full name
        </label>
        <Input id="name" name="name" required className="mt-1 h-10" />
      </div>
      <div>
        <label className="text-[11px] font-semibold" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" required className="mt-1 h-10" />
      </div>
      <div>
        <label className="text-[11px] font-semibold" htmlFor="linkedinUrl">
          LinkedIn <span className="font-normal text-slate-400">optional</span>
        </label>
        <Input id="linkedinUrl" name="linkedinUrl" type="url" className="mt-1 h-10" />
      </div>
      <div>
        <label className="text-[11px] font-semibold" htmlFor="resume">
          Resume PDF
        </label>
        <div className="mt-1.5">
          <input
            id="resume"
            name="resume"
            type="file"
            accept="application/pdf"
            required
            className="peer sr-only"
            onChange={(event) => setResumeName(event.currentTarget.files?.[0]?.name ?? "")}
          />
          <label
            htmlFor="resume"
            className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-3.5 py-3 transition-colors hover:border-slate-400 hover:bg-slate-50 peer-focus-visible:border-slate-950 peer-focus-visible:ring-2 peer-focus-visible:ring-slate-950/15"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,.08)]">
              {resumeName ? <FilePdf size={18} weight="fill" className="text-red-500" /> : <UploadSimple size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-slate-700">
                {resumeName || "Choose a resume"}
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {resumeName ? "Ready to upload" : "Select a PDF from your device"}
              </span>
            </span>
            <span className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,.08)]">
              Browse
            </span>
          </label>
        </div>
        <p className="mt-1 text-[9px] text-slate-400">PDF, including scanned documents · maximum 5 MB</p>
      </div>
      <label className="flex items-start gap-2 text-[10px] leading-4 text-slate-500">
        <Checkbox name="consent" required className="mt-0.5" />I consent to automated resume analysis. AI provides a
        recommendation; a person reviews hiring decisions.
      </label>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-[10px] text-red-700">{error}</p> : null}
      <Button
        type="submit"
        disabled={loading}
        aria-busy={loading}
        className="h-11 w-full rounded-lg bg-slate-950 text-white"
      >
        {loading ? (
          <>
            <Spinner aria-hidden="true" /> Submitting securely…
          </>
        ) : (
          <>
            Submit application <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
