import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { TechLeadSettings } from "@/components/tech-lead-settings";
import { getDb } from "@/db";
import { workspaceSettings } from "@/db/schema";

export default function SettingsPage() {
  const integrations = [
    ["OpenRouter", Boolean(process.env.OPENROUTER_API_KEY)],
    ["Neon Postgres", Boolean(process.env.DATABASE_URL)],
    ["Vercel Blob", Boolean(process.env.BLOB_READ_WRITE_TOKEN)],
    ["Cal.com", Boolean(process.env.CAL_API_KEY)],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-medium text-slate-400">Workspace</p>
        <h1 className="mt-1 text-2xl font-semibold">Integrations</h1>
        <p className="mt-1 text-sm text-slate-500">Integration readiness for this workspace.</p>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
        <h2 className="text-sm font-semibold">Integrations</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {integrations.map(([name, ready]) => (
            <div key={String(name)} className="flex items-center justify-between py-3 text-xs">
              <span>{name}</span>
              <span className={ready ? "text-emerald-700" : "text-amber-700"}>
                {ready ? "Connected" : "Not configured"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,.05)]">
        <h2 className="text-sm font-semibold">First meeting</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          The candidate and this tech lead will receive the calendar invite when you schedule a first meeting.
        </p>
        <Suspense fallback={<TechLeadSettingsFallback />}>
          <TechLeadSettingsData />
        </Suspense>
      </div>
    </div>
  );
}

async function TechLeadSettingsData() {
  const [settings] = await getDb()
    .select({ techLeadEmail: workspaceSettings.techLeadEmail })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, "default"))
    .limit(1);

  return <TechLeadSettings initialEmail={settings?.techLeadEmail ?? ""} />;
}

function TechLeadSettingsFallback() {
  return <div className="mt-4 h-9 animate-pulse rounded-lg bg-slate-100" />;
}
