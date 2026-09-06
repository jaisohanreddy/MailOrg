"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { EmailFeedbackDecision as FeedbackDecision } from "@/generated/prisma/client";
import { setEmailImportanceFeedback } from "./actions";

// No optimistic UI here by design: the button only reflects the saved
// decision once the write succeeds and router.refresh() brings back the
// fresh value from the server, the same pattern StarToggle/ArchiveButton
// use for Gmail actions.
export function EmailFeedbackControl({
  messageId,
  currentDecision,
}: {
  messageId: string;
  currentDecision: FeedbackDecision | null;
}) {
  const router = useRouter();
  const [pendingDecision, setPendingDecision] = useState<FeedbackDecision | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleClick(decision: FeedbackDecision) {
    setPendingDecision(decision);
    setError(null);

    const result = await setEmailImportanceFeedback(messageId, decision);

    setPendingDecision(null);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  const isBusy = pendingDecision !== null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
      <p className="text-sm font-medium text-black dark:text-zinc-50">
        Is this important to you?
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleClick("IMPORTANT")}
          disabled={isBusy}
          aria-pressed={currentDecision === "IMPORTANT"}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            currentDecision === "IMPORTANT"
              ? "bg-emerald-600 text-white"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {pendingDecision === "IMPORTANT" ? "Saving…" : "Important"}
        </button>
        <button
          type="button"
          onClick={() => handleClick("NOT_IMPORTANT")}
          disabled={isBusy}
          aria-pressed={currentDecision === "NOT_IMPORTANT"}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
            currentDecision === "NOT_IMPORTANT"
              ? "bg-zinc-700 text-white dark:bg-zinc-600"
              : "border border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {pendingDecision === "NOT_IMPORTANT" ? "Saving…" : "Not important"}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
