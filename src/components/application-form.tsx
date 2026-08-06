"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
export function ApplicationForm({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/applications", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error);
    setToken(data.publicToken);
  }
  if (token)
    return (
      <div className="rounded-2xl bg-emerald-50 p-6 text-emerald-900">
        <CheckCircle size={24} weight="fill" />
        <h2 className="mt-3 text-sm font-semibold">Application received</h2>
        <p className="mt-2 text-xs leading-5 text-emerald-700">
          Your resume is being processed. Save the private status link below.
        </p>
        <a
          href={`/application/${token}`}
          className="mt-3 inline-flex min-h-10 items-center text-xs font-semibold underline"
        >
          View application status
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
        <Input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 h-10"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold" htmlFor="linkedinUrl">
          LinkedIn <span className="font-normal text-slate-400">optional</span>
        </label>
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          type="url"
          className="mt-1 h-10"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold" htmlFor="resume">
          Resume PDF
        </label>
        <Input
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 h-10 py-1.5"
        />
        <p className="mt-1 text-[9px] text-slate-400">
          PDF, including scanned documents · maximum 5 MB
        </p>
      </div>
      <label className="flex items-start gap-2 text-[10px] leading-4 text-slate-500">
        <Checkbox name="consent" required className="mt-0.5" />I consent to
        automated resume analysis. AI provides a recommendation; a person
        reviews hiring decisions.
      </label>
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-[10px] text-red-700">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-lg bg-slate-950 text-white"
      >
        {loading ? (
          "Submitting securely…"
        ) : (
          <>
            Submit application <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
