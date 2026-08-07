import {
  CalendarCheck,
  CheckCircle,
  FileText,
  Robot,
  ShieldCheck,
  Target,
  Warning,
} from "@phosphor-icons/react/dist/ssr";

const ratings = [
  {
    label: "Strong fit",
    range: "75–100",
    summary: "Strong evidence across the weighted role criteria.",
    tone: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    width: "w-full",
  },
  {
    label: "Potential fit",
    range: "50–74.9",
    summary: "Relevant evidence is present, with meaningful gaps or weaker alignment.",
    tone: "bg-amber-50 text-amber-700",
    bar: "bg-amber-400",
    width: "w-3/4",
  },
  {
    label: "Unfit",
    range: "Below 50",
    summary: "The resume evidence does not meet enough of the weighted criteria.",
    tone: "bg-rose-50 text-rose-700",
    bar: "bg-rose-400",
    width: "w-[46%]",
  },
];

const reviewTriggers = [
  ["Low extraction confidence", "Resume extraction confidence is below 75%."],
  ["Required evidence missing", "A required criterion has no supporting resume evidence."],
  ["Low-confidence assessment", "At least one scored criterion is marked low confidence."],
];

export default function InformationPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-medium text-slate-400">Decision guide</p>
        <h1 className="mt-1 text-balance text-2xl font-semibold tracking-[-0.03em]">How Hireflow decides</h1>
        <p className="mt-1 max-w-2xl text-pretty text-sm text-slate-500">
          A compact reference for scoring, review flags, rubrics, and interview automation.
        </p>
      </header>

      <section>
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Target size={20} weight="fill" />
          </span>
          <div>
            <p className="text-sm font-semibold">Recommendation = weighted evidence score</p>
            <p className="mt-1 max-w-2xl text-pretty text-xs leading-5 text-slate-500">
              Every rubric criterion is scored from 0–5 against cited resume evidence, then multiplied by its weight to
              produce a score out of 100.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ratings.map((rating) => (
            <div
              key={rating.label}
              className="rounded-xl bg-white p-4 text-slate-950 shadow-[0_0_0_1px_rgba(15,23,42,.06),0_1px_2px_rgba(15,23,42,.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${rating.tone}`}>{rating.label}</span>
                <span className="tabular-nums text-xs font-semibold text-slate-500">{rating.range}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${rating.bar} ${rating.width}`} />
              </div>
              <p className="mt-3 text-pretty text-[11px] leading-5 text-slate-500">{rating.summary}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.06),0_1px_2px_rgba(15,23,42,.04)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
              <Warning size={18} weight="fill" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">Human review flag</h2>
              <p className="text-xs text-slate-400">An uncertainty signal—not a rating.</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {reviewTriggers.map(([title, description]) => (
              <div key={title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <CheckCircle className="mt-0.5 shrink-0 text-amber-500" size={16} weight="fill" />
                <div>
                  <p className="text-xs font-semibold">{title}</p>
                  <p className="mt-1 text-pretty text-[11px] leading-5 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-pretty text-[11px] leading-5 text-slate-600">
            A strong-fit candidate may still carry this flag. It keeps uncertainty visible but does not block Agent-mode
            scheduling.
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.06),0_1px_2px_rgba(15,23,42,.04)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <FileText size={18} weight="fill" />
            </span>
            <div>
              <h2 className="text-sm font-semibold">How the rubric is created</h2>
              <p className="text-xs text-slate-400">Role-specific and evidence-led.</p>
            </div>
          </div>
          <ol className="mt-4 space-y-2.5">
            {[
              ["01", "Approved requirements", "Only the approved job specification is used."],
              ["02", "Weighted criteria", "AI creates 4–6 concrete criteria totaling 100%."],
              ["03", "Scoring anchors", "Each criterion defines what 0, 3, and 5 look like."],
              ["04", "Resume evidence", "Scores must cite explicit evidence; missing details are not inferred."],
            ].map(([number, title, description]) => (
              <li key={number} className="flex gap-3 rounded-xl bg-slate-50 p-3">
                <span className="tabular-nums text-[10px] font-semibold text-violet-600">{number}</span>
                <div>
                  <p className="text-xs font-semibold">{title}</p>
                  <p className="mt-0.5 text-pretty text-[11px] leading-5 text-slate-500">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="rounded-2xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.06),0_1px_2px_rgba(15,23,42,.04)]">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarCheck size={18} weight="fill" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Interview scheduling</h2>
            <p className="text-xs text-slate-400">The workspace mode controls the final action.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Robot className="text-lime-300" size={17} weight="fill" /> Agent mode
            </div>
            <p className="mt-2 text-pretty text-[11px] leading-5 text-slate-300">
              Strong and potential fits are scheduled automatically. Unfit candidates are not scheduled.
            </p>
          </div>
          <div className="rounded-xl bg-violet-50 p-4 text-violet-950">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="text-violet-600" size={17} weight="fill" /> Approval mode
            </div>
            <p className="mt-2 text-pretty text-[11px] leading-5 text-violet-800/80">
              Interview invitations pause for a person to review and approve before sending.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
