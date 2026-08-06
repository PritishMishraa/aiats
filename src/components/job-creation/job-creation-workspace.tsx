"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, MagicWand, MapPin, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

type JobDraft = {
  title?: string;
  department?: string;
  summary?: string;
  employmentType?: string;
  workplaceType?: string;
  location?: { city?: string | null; country?: string | null };
  responsibilities?: (string | undefined)[];
  requiredQualifications?: (string | undefined)[];
  preferredQualifications?: (string | undefined)[];
  assumptions?: (string | undefined)[];
};

type GenerationRun = {
  id: string;
  workflowRunId: string | null;
  status: string;
  prompt: string;
  draft: JobDraft | null;
  jobId: string | null;
  error: string | null;
};

const suggestions = [
  "Team and reporting line",
  "Experience and core skills",
  "Location and working model",
  "Compensation range",
];

export function JobCreationWorkspace() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "We need a senior backend engineer with 3+ years of Go, PostgreSQL and distributed systems experience. Bengaluru hybrid, working with the platform team.",
  );
  const [draft, setDraft] = useState<JobDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);
  const refreshing = useRef(false);
  const refreshQueued = useRef(false);

  const applyRun = useCallback(
    (run: GenerationRun) => {
      setGenerationId(run.id);
      setWorkflowRunId(run.workflowRunId);
      setPrompt(run.prompt);
      setDraft(run.draft);
      setLoading(run.status === "queued" || run.status === "running");
      setError(run.error ?? "");
      if (run.jobId && run.status !== "queued" && run.status !== "running") router.push(`/admin/jobs/${run.jobId}`);
    },
    [router],
  );

  useEffect(() => {
    const id = new URL(window.location.href).searchParams.get("generation");
    fetch(`/api/jobs/generate?${id ? `id=${encodeURIComponent(id)}` : "active=1"}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.run) applyRun(data.run);
      })
      .catch(() => undefined);
  }, [applyRun]);

  useEffect(() => {
    if (!generationId || !workflowRunId || !loading) return;
    const currentGenerationId = generationId;
    const currentWorkflowRunId = workflowRunId;

    async function refresh() {
      if (refreshing.current) {
        refreshQueued.current = true;
        return;
      }

      refreshing.current = true;
      try {
        const response = await fetch(`/api/jobs/generate?id=${encodeURIComponent(currentGenerationId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (response.ok && data.run) applyRun(data.run);
      } catch {
        // Keep the latest persisted state while EventSource reconnects.
      } finally {
        refreshing.current = false;
        if (refreshQueued.current) {
          refreshQueued.current = false;
          void refresh();
        }
      }
    }

    const source = new EventSource(`/api/workflows/${encodeURIComponent(currentWorkflowRunId)}/events`);
    source.onopen = () => void refresh();
    source.onmessage = () => void refresh();

    return () => source.close();
  }, [applyRun, generationId, loading, workflowRunId]);

  async function generate() {
    setLoading(true);
    setDraft(null);
    setError("");

    try {
      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const data = await response.json();
      applyRun(data.run);
      window.history.replaceState(null, "", `/admin/jobs/new?generation=${data.run.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation failed");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <div>
        <Link
          href="/admin/jobs"
          className="mb-5 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-950"
        >
          <ArrowLeft /> Back to jobs
        </Link>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
            <MagicWand size={19} weight="fill" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.03em] text-balance">Create a new job</h1>
            <p className="mt-1 text-sm text-slate-500 text-pretty">
              Describe the role naturally and watch Hireflow shape it into a job description.
            </p>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <section className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,.05),0_0_0_1px_rgba(15,23,42,.06)] lg:sticky lg:top-6">
          <>
            <label htmlFor="job-prompt" className="text-sm font-semibold">
              What are you hiring for?
            </label>
            <p id="job-prompt-help" className="mt-1 text-xs leading-5 text-slate-500">
              Include what you know. We’ll call out assumptions and missing details.
            </p>
            <div className="group mt-5 overflow-hidden rounded-2xl bg-white shadow-[0_0_0_1px_rgba(15,23,42,.10),0_2px_5px_rgba(15,23,42,.04),0_10px_24px_rgba(15,23,42,.04)] transition-[box-shadow] duration-200 focus-within:shadow-[0_0_0_1px_rgb(139,92,246),0_0_0_4px_rgba(139,92,246,.10),0_10px_28px_rgba(15,23,42,.07)]">
              <div className="flex items-center justify-between gap-3 px-4 pt-4">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                  <span className="grid size-6 place-items-center rounded-lg bg-violet-50 text-violet-600">
                    <MagicWand size={13} weight="fill" aria-hidden="true" />
                  </span>
                  Describe it in your own words
                </div>
                <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">⌘/Ctrl Enter to draft</span>
              </div>
              <Textarea
                id="job-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    (event.metaKey || event.ctrlKey) &&
                    event.key === "Enter" &&
                    !loading &&
                    prompt.trim().length >= 20
                  ) {
                    event.preventDefault();
                    void generate();
                  }
                }}
                disabled={loading}
                aria-describedby="job-prompt-help job-prompt-status"
                placeholder="For example: We’re looking for a product designer to join our growth team…"
                className="min-h-48 max-h-80 resize-none overflow-y-auto rounded-none border-0 bg-transparent px-4 py-4 text-[13px] leading-6 shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent"
              />
              <div className="flex min-h-16 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-3 py-2.5 pl-4">
                <div id="job-prompt-status" className="flex min-w-0 items-center gap-2 text-[11px]">
                  <span
                    className={`size-1.5 shrink-0 rounded-full transition-[background-color] duration-150 ${
                      prompt.trim().length >= 20 ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  <span className={prompt.trim().length >= 20 ? "text-slate-600" : "text-slate-400"}>
                    {prompt.trim().length >= 20 ? "Ready to draft" : "20 character minimum"}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="tabular-nums text-slate-400">{prompt.length}</span>
                  <span className="sr-only"> characters</span>
                </div>
                <Button
                  onClick={generate}
                  disabled={loading || prompt.trim().length < 20}
                  aria-busy={loading}
                  className="h-10 shrink-0 rounded-xl bg-slate-950 pl-3.5 pr-4 text-white shadow-[0_1px_2px_rgba(15,23,42,.2),0_4px_10px_rgba(15,23,42,.12)] hover:bg-slate-800"
                >
                  {loading ? <Spinner aria-hidden="true" /> : <Sparkle weight="fill" className="text-lime-300" />}
                  {loading ? "Creating draft…" : "Generate draft"}
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="mt-5 flex items-center gap-3 rounded-xl bg-violet-50 p-3 text-xs text-violet-900">
                <span className="size-2 animate-pulse rounded-full bg-violet-500" />
                Writing your job description live
              </div>
            ) : null}
            {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          </>
        </section>

        <JobDraftPreview draft={draft} streaming={loading} />
      </div>
    </div>
  );
}

function JobDraftPreview({ draft, streaming }: { draft: JobDraft | null; streaming: boolean }) {
  if (!draft && !streaming) {
    return (
      <aside className="space-y-4">
        <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-[0_12px_32px_rgba(15,23,42,.14)]">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Sparkle className="text-lime-300" weight="fill" /> Better prompts make better drafts
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {suggestions.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[11px] text-slate-300">
                <Check className="text-lime-300" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
          <Info size={17} className="mt-0.5 shrink-0" />
          <p className="text-[11px] leading-5">
            AI output is always a draft. You’ll approve the job and its scoring rubric before candidates are evaluated.
          </p>
        </div>
      </aside>
    );
  }

  const location = [draft?.location?.city, draft?.location?.country].filter(Boolean).join(", ");
  return (
    <aside className="min-h-[620px] overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,.05),0_0_0_1px_rgba(15,23,42,.06)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span className={`size-2 rounded-full ${streaming ? "animate-pulse bg-violet-500" : "bg-emerald-500"}`} />
          Live job description
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[.12em] text-slate-400">
          {streaming ? "Drafting" : "Draft"}
        </span>
      </div>
      <article aria-live="polite" aria-busy={streaming} className="p-6 sm:p-8">
        <h2 className="min-h-9 text-2xl font-semibold tracking-[-0.03em] text-balance">
          {draft?.title || <WritingLine className="w-2/3" />}
        </h2>
        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-xs capitalize text-slate-500">
          {location ? (
            <span className="flex max-w-full items-center gap-1">
              <MapPin className="shrink-0" /> {location}
            </span>
          ) : null}
          {draft?.employmentType ? (
            <span className="capitalize">{draft.employmentType.replaceAll("_", " ")}</span>
          ) : null}
          {draft?.workplaceType ? <span>{draft.workplaceType}</span> : null}
          {draft?.department ? <span>{draft.department}</span> : null}
        </div>
        <DraftSection title="About the role" text={draft?.summary} streaming={streaming} />
        <DraftList title="What you’ll do" items={draft?.responsibilities} streaming={streaming} />
        <DraftList title="What we’re looking for" items={draft?.requiredQualifications} streaming={streaming} />
        {draft?.preferredQualifications?.length ? (
          <DraftList title="Nice to have" items={draft.preferredQualifications} streaming={false} />
        ) : null}
        {draft?.assumptions?.length ? (
          <div className="mt-8 rounded-xl bg-amber-50 p-4">
            <h3 className="text-xs font-semibold text-amber-900">Assumptions to review</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-5 text-amber-800">
              {draft.assumptions.filter(Boolean).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </aside>
  );
}

function DraftSection({ title, text, streaming }: { title: string; text?: string; streaming: boolean }) {
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold">{title}</h3>
      {text ? (
        <p className="mt-3 text-sm leading-7 text-slate-600 text-pretty">{text}</p>
      ) : streaming ? (
        <WritingLine className="mt-4 w-full" />
      ) : null}
    </section>
  );
}

function DraftList({ title, items, streaming }: { title: string; items?: (string | undefined)[]; streaming: boolean }) {
  const visibleItems = items?.filter((item): item is string => Boolean(item)) ?? [];
  return (
    <section className="mt-8">
      <h3 className="text-sm font-semibold">{title}</h3>
      {visibleItems.length ? (
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          {visibleItems.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : streaming ? (
        <WritingLine className="mt-4 w-4/5" />
      ) : null}
    </section>
  );
}

function WritingLine({ className }: { className?: string }) {
  return <span className={`block h-3 animate-pulse rounded-full bg-slate-100 ${className ?? ""}`} />;
}
