"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import {
  Briefcase,
  CaretLeft,
  CaretRight,
  GearSix,
  House,
  Info,
  Lightning,
  List,
  Robot,
  ShieldCheck,
  Stack,
  Users,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkflowMode } from "@/lib/workspace-mode";

const nav = [
  { href: "/admin", label: "Overview", icon: House },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/workflows", label: "Workflows", icon: Stack },
];

function isActiveRoute(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(`${href}/`) || pathname === href;
}

function linkClasses(active: boolean, compact = false) {
  return cn(
    "flex min-h-10 items-center rounded-lg text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
    compact ? "justify-center px-0" : "gap-3 px-3",
    active && "bg-slate-100 text-slate-950",
  );
}

function Navigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Main navigation">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={compact ? label : undefined}
            className={linkClasses(active, compact)}
          >
            <Icon size={17} weight={active ? "fill" : "regular"} />
            {!compact && <span>{label}</span>}
            {compact && <span className="sr-only">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function UtilityNavigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1" aria-label="Help and settings">
      {[
        { href: "/admin/information", label: "Decision policy", icon: Info },
        { href: "/admin/settings", label: "Integrations", icon: GearSix },
      ].map(({ href, label, icon: Icon }) => {
        const active = isActiveRoute(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={compact ? label : undefined}
            className={linkClasses(active, compact)}
          >
            <Icon size={17} weight={active ? "fill" : "regular"} />
            {!compact && <span>{label}</span>}
            {compact && <span className="sr-only">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function ModeControl({
  mode,
  onChange,
  compact = false,
  saving = false,
}: {
  mode: WorkflowMode;
  onChange: (mode: WorkflowMode) => void;
  compact?: boolean;
  saving?: boolean;
}) {
  if (compact) {
    const Icon = mode === "agent" ? Robot : ShieldCheck;
    return (
      <button
        type="button"
        onClick={() => onChange(mode === "agent" ? "approval" : "agent")}
        disabled={saving}
        title={`${mode === "agent" ? "Agent" : "Approval"} mode`}
        aria-label={`Workflow mode: ${mode}. Click to switch.`}
        className={cn(
          "relative grid size-10 place-items-center rounded-[11px] shadow-[0_1px_2px_rgba(15,23,42,.08),0_0_0_1px_rgba(15,23,42,.06)] transition-[background-color,color,transform] duration-200 ease-out active:scale-[.96] disabled:opacity-60",
          mode === "agent"
            ? "bg-slate-950 text-lime-300 hover:bg-slate-800"
            : "bg-white text-violet-700 hover:bg-violet-50",
        )}
      >
        <Icon size={18} weight="fill" />
        <span
          className={cn(
            "absolute right-0.5 top-0.5 size-2 rounded-full ring-2 ring-white",
            mode === "agent" ? "bg-emerald-400" : "bg-amber-400",
          )}
        />
      </button>
    );
  }

  return (
    <section
      className="rounded-[15px] bg-white p-2.5 shadow-[0_8px_24px_rgba(15,23,42,.06),0_0_0_1px_rgba(15,23,42,.07)]"
      aria-label="Workflow mode"
    >
      <div className="mb-2 flex items-center justify-between px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">Workflow control</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-900">
            {mode === "agent" ? "Autopilot is on" : "Reviews are on"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[.08em]",
            mode === "agent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
          )}
          aria-live="polite"
        >
          <span className={cn("size-1.5 rounded-full", mode === "agent" ? "bg-emerald-500" : "bg-amber-500")} />
          {saving ? "Saving" : "Live"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-[11px] bg-slate-100 p-1 shadow-inner">
        {(["approval", "agent"] as const).map((option) => {
          const Icon = option === "agent" ? Robot : ShieldCheck;
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              disabled={saving}
              aria-pressed={active}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold capitalize text-slate-500 transition-[background-color,color,box-shadow,transform] duration-200 ease-out hover:text-slate-900 active:scale-[.96]",
                active &&
                  option === "agent" &&
                  "bg-slate-950 text-white shadow-[0_3px_8px_rgba(15,23,42,.2)] hover:text-white",
                active && option === "approval" && "bg-white text-slate-950 shadow-[0_1px_3px_rgba(15,23,42,.12)]",
                saving && "cursor-wait opacity-70",
              )}
            >
              <Icon
                size={15}
                weight={active ? "fill" : "regular"}
                className={cn(active && option === "agent" && "text-lime-300")}
              />
              {option}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex gap-2 px-0.5">
        <span
          className={cn("mt-1 size-1.5 shrink-0 rounded-full", mode === "agent" ? "bg-violet-500" : "bg-slate-300")}
        />
        <p className="text-pretty text-[10px] leading-4 text-slate-500">
          {mode === "agent"
            ? "Drafts, rubrics, publishing, and strong- or potential-fit interviews run automatically."
            : "Jobs and interview invitations pause for your approval."}
        </p>
      </div>
    </section>
  );
}

export function AppShell({
  children,
  aiCost,
  initialMode,
}: {
  children: React.ReactNode;
  aiCost: React.ReactNode;
  initialMode: WorkflowMode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [mode, setMode] = useState<WorkflowMode>(initialMode);
  const [isSavingMode, setIsSavingMode] = useState(false);
  async function changeMode(nextMode: WorkflowMode) {
    if (nextMode === mode || isSavingMode) return;
    const previousMode = mode;
    setMode(nextMode);
    setIsSavingMode(true);
    try {
      const response = await fetch("/api/settings/workflow-mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      if (!response.ok) throw new Error("Unable to update workflow mode");
    } catch {
      setMode(previousMode);
    } finally {
      setIsSavingMode(false);
    }
  }
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-slate-200/80 bg-white py-4 transition-[width] duration-200 ease-out lg:flex",
          isCollapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        <div className={cn("flex h-10 items-center", isCollapsed ? "justify-center" : "justify-between px-2")}>
          <Link href="/admin" className="flex items-center gap-2.5" title={isCollapsed ? "Hireflow" : undefined}>
            <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white shadow-sm">
              <Lightning size={17} weight="fill" />
            </span>
            {!isCollapsed && <span className="text-[15px] font-semibold tracking-tight">Hireflow</span>}
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="grid size-10 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
              aria-label="Collapse sidebar"
            >
              <CaretLeft size={16} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="mt-3 grid size-10 place-items-center self-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Expand sidebar"
          >
            <CaretRight size={16} />
          </button>
        )}
        <div className={cn(isCollapsed ? "mt-5" : "mt-7")}>
          <Suspense>
            <Navigation compact={isCollapsed} />
          </Suspense>
        </div>
        <div className="mt-auto space-y-3">
          <div className={cn(isCollapsed && "flex justify-center")}>
            <ModeControl mode={mode} onChange={changeMode} compact={isCollapsed} saving={isSavingMode} />
          </div>
          {!isCollapsed && (
            <div className="rounded-xl bg-slate-950 p-3.5 text-white shadow-[0_8px_24px_rgba(15,23,42,.12)]">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Lightning className="text-lime-300" weight="fill" /> All-time AI cost
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-white">{aiCost}</div>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Across every tracked AI workflow step.</p>
            </div>
          )}
          <Suspense>
            <UtilityNavigation compact={isCollapsed} />
          </Suspense>
        </div>
      </aside>

      {isMobileNavOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/20"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-72 flex-col bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <Link href="/admin" onClick={() => setIsMobileNavOpen(false)} className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white">
                  <Lightning size={16} weight="fill" />
                </span>
                <span className="text-[15px] font-semibold tracking-tight">Hireflow</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-7">
              <Suspense>
                <Navigation onNavigate={() => setIsMobileNavOpen(false)} />
              </Suspense>
            </div>
            <div className="mt-auto space-y-3">
              <ModeControl mode={mode} onChange={changeMode} saving={isSavingMode} />
              <Suspense>
                <UtilityNavigation onNavigate={() => setIsMobileNavOpen(false)} />
              </Suspense>
            </div>
          </aside>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200 ease-out", isCollapsed ? "lg:pl-16" : "lg:pl-60")}>
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-5 md:px-8">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation"
          >
            <List size={20} />
          </button>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/careers"
              className={buttonVariants({ variant: "ghost", size: "lg", className: "hidden sm:inline-flex" })}
            >
              Careers
            </Link>
            <Link
              href="/admin/jobs/new"
              className={buttonVariants({
                size: "lg",
                className: "rounded-lg bg-slate-950 px-3 text-white hover:bg-slate-800",
              })}
            >
              Create job
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
