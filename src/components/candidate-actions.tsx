"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle, EnvelopeSimple, FilePdf, UserCirclePlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function CandidateActions({
  applicationId,
  resumeHref,
  scheduled,
  techLeadEmail,
}: {
  applicationId: string;
  resumeHref: string;
  scheduled: boolean;
  techLeadEmail: string | null;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState(techLeadEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<"schedule" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function schedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const techLeadEmail = email.trim();
    if (!techLeadEmail) {
      setError("Add the tech lead’s email to continue.");
      return;
    }

    setLoading(true);
    setPendingAction("schedule");
    try {
      const settingsResponse = await fetch("/api/settings/tech-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ techLeadEmail }),
      });
      const settingsData = await settingsResponse.json();
      if (!settingsResponse.ok) {
        setError(settingsData.error ?? "Unable to save the tech lead email.");
        return;
      }

      const response = await fetch(`/api/applications/${applicationId}/schedule`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Interview scheduling failed.");
        return;
      }

      setDialogOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  async function reject() {
    const reason = window.prompt("Reason for rejection (saved to the audit log)");
    if (!reason) return;
    setLoading(true);
    setPendingAction("reject");
    setError("");
    try {
      const response = await fetch(`/api/applications/${applicationId}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision: "reject", reason }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error);
      else router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <a
          href={resumeHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
        >
          <FilePdf weight="bold" /> Resume
        </a>
        {!scheduled ? (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button
              onClick={() => setDialogOpen(true)}
              disabled={loading}
              className="h-10 bg-slate-950 px-4 text-white shadow-sm"
            >
              <CalendarPlus weight="bold" />
              Schedule first interview
            </Button>
            <DialogContent className="gap-5 p-6 sm:max-w-md" showCloseButton={!loading}>
              <DialogHeader className="gap-2 pr-8">
                <div className="flex size-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                  <UserCirclePlus size={20} weight="bold" />
                </div>
                <DialogTitle className="mt-2 text-base font-semibold tracking-tight">Invite the tech lead</DialogTitle>
                <DialogDescription className="text-sm leading-5 text-slate-500">
                  This person will join the candidate’s first interview. You can update the saved host anytime.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={schedule} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="candidate-tech-lead-email" className="text-xs font-semibold text-slate-700">
                    Tech lead email
                  </label>
                  <div className="relative">
                    <EnvelopeSimple
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={17}
                    />
                    <Input
                      id="candidate-tech-lead-email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="tech.lead@company.com"
                      className="h-11 pl-10 text-sm"
                      aria-describedby={error ? "tech-lead-error" : undefined}
                    />
                  </div>
                  {error ? (
                    <p id="tech-lead-error" role="alert" className="text-xs font-medium text-red-600">
                      {error}
                    </p>
                  ) : null}
                </div>
                <DialogFooter className="pt-1">
                  <DialogClose render={<Button type="button" variant="ghost" disabled={loading} />}>Cancel</DialogClose>
                  <Button
                    type="submit"
                    disabled={loading}
                    aria-busy={pendingAction === "schedule"}
                    className="h-10 bg-slate-950 px-4 text-white"
                  >
                    {pendingAction === "schedule" ? (
                      <>
                        <Spinner aria-hidden="true" /> Scheduling…
                      </>
                    ) : (
                      "Save & schedule"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircle weight="fill" /> Interview scheduled
          </span>
        )}
        <Button
          variant="outline"
          onClick={reject}
          disabled={loading}
          aria-busy={pendingAction === "reject"}
          className="h-10 border-slate-200 text-red-700 hover:bg-red-50 hover:text-red-800"
        >
          {pendingAction === "reject" ? (
            <>
              <Spinner aria-hidden="true" /> Rejecting…
            </>
          ) : (
            "Reject"
          )}
        </Button>
      </div>
      {error && !dialogOpen ? (
        <p role="alert" className="w-full text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
