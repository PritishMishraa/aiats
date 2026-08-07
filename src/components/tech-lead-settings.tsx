"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

export function TechLeadSettings({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/settings/tech-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ techLeadEmail: email }),
      });
      const data = await response.json();
      setStatus(response.ok ? "Saved. This person will be invited to every first meeting." : data.error);
    } catch {
      setStatus("Could not save the email. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3">
      <label htmlFor="tech-lead-email" className="text-xs font-medium text-slate-700">
        Tech lead email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="tech-lead-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tech.lead@company.com"
          className="h-10"
        />
        <Button type="submit" disabled={saving} aria-busy={saving} className="h-10 bg-slate-950 px-4 text-white">
          {saving ? (
            <>
              <Spinner aria-hidden="true" /> Saving…
            </>
          ) : (
            "Save email"
          )}
        </Button>
      </div>
      {status ? (
        <p
          aria-live="polite"
          className={status.startsWith("Saved") ? "text-xs text-emerald-700" : "text-xs text-red-600"}
        >
          {status}
        </p>
      ) : null}
    </form>
  );
}
