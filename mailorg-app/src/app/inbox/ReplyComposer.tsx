"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendReplyAction } from "./actions";

// No optimistic UI: the composer only closes and the thread only refreshes
// after the send actually succeeds, matching the pattern used elsewhere
// (StarToggle, EmailFeedbackControl, ...). isSending disables the Send
// button for the whole round-trip, preventing a repeated click from firing
// a second send while the first is still in flight.
export function ReplyComposer({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setIsOpen(false);
    setBody("");
    setError(null);
  }

  async function handleSend() {
    if (!body.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendReplyAction(messageId, body);

    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setBody("");
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-fit items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Reply
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
      <p className="text-sm font-medium text-black dark:text-zinc-50">
        Reply
      </p>
      <textarea
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setError(null);
        }}
        rows={6}
        disabled={isSending}
        placeholder="Write your reply…"
        className="w-full resize-none rounded-xl border border-black/[.08] bg-white p-3 text-sm leading-6 text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
      />

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !body.trim()}
          className="flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSending}
          className="flex h-9 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
