"use client";

import { useState, useTransition } from "react";

type ActionResult = {
  ok: boolean;
  message: string;
};

export function AdminControls() {
  const [status, setStatus] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(path: string) {
    startTransition(async () => {
      setStatus(null);
      const response = await fetch(path, {
        method: "POST",
      });
      const data = (await response.json()) as { message?: string };
      setStatus({
        ok: response.ok,
        message: data.message ?? (response.ok ? "Completed successfully." : "Request failed."),
      });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("/api/admin/sync")}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Run manual sync
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("/api/admin/train")}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          Train model
        </button>
      </div>
      {status ? (
        <p className={`text-sm ${status.ok ? "text-teal-700" : "text-red-700"}`}>{status.message}</p>
      ) : null}
    </div>
  );
}
