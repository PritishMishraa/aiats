import Link from "next/link";
import { Briefcase, CaretDown, ChartBar, GearSix, House, Lightning, MagnifyingGlass, Stack, Users } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Overview", icon: House },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase, count: 4 },
  { href: "/admin/candidates", label: "Candidates", icon: Users, count: 60 },
  { href: "/admin/workflows", label: "Workflows", icon: Stack },
  { href: "/admin/analytics", label: "Analytics", icon: ChartBar },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f8] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-slate-200/80 bg-white px-3 py-4 lg:flex">
        <Link href="/admin" className="flex h-10 items-center gap-2.5 px-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white shadow-sm"><Lightning size={17} weight="fill" /></span>
          <span className="text-[15px] font-semibold tracking-tight">Hireflow</span>
        </Link>
        <nav className="mt-7 space-y-1" aria-label="Main navigation">
          {nav.map(({ href, label, icon: Icon, count }, index) => (
            <Link key={href} href={href} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900", index === 0 && "bg-slate-100 text-slate-950")}>
              <Icon size={17} weight={index === 0 ? "fill" : "regular"} />
              <span>{label}</span>
              {count ? <span className="ml-auto tabular-nums text-[11px] text-slate-400">{count}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-xl bg-slate-950 p-3.5 text-white shadow-[0_8px_24px_rgba(15,23,42,.12)]">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium"><Lightning className="text-lime-300" weight="fill" /> AI workspace</div>
            <p className="text-[11px] leading-5 text-slate-400">42 of 100 evaluations used this month</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[42%] rounded-full bg-lime-300" /></div>
          </div>
          <Link href="/admin/settings" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"><GearSix size={17} /> Settings</Link>
          <button className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-slate-100">
            <span className="grid size-8 place-items-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">PM</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">Pritish Mishra</span><span className="block truncate text-[10px] text-slate-400">Admin</span></span>
            <CaretDown size={13} className="text-slate-400" />
          </button>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 lg:hidden"><span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white"><Lightning size={16} weight="fill" /></span><b className="text-sm">Hireflow</b></div>
          <div className="hidden w-72 items-center gap-2 rounded-lg bg-slate-100 px-3 text-slate-400 md:flex"><MagnifyingGlass size={15} /><input aria-label="Search" placeholder="Search jobs or candidates" className="h-9 w-full bg-transparent text-xs outline-none placeholder:text-slate-400" /><kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px]">⌘K</kbd></div>
          <div className="ml-auto flex items-center gap-2"><Link href="/careers" className={buttonVariants({ variant: "ghost", size: "lg", className: "hidden sm:inline-flex" })}>View careers site</Link><Link href="/admin/jobs/new" className={buttonVariants({ size: "lg", className: "h-9 rounded-lg bg-slate-950 px-3.5 text-white hover:bg-slate-800" })}>Create job</Link></div>
        </header>
        <main className="mx-auto max-w-[1280px] p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
