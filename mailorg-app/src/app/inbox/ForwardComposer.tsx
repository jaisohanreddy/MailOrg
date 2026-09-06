"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendForwardAction } from "./actions";

// Same pattern as ReplyComposer: no optimistic UI, and isSending disables
// Send for the whole round-trip so a repeated click can't fire a second
// forward while the first is still in flight.
export function ForwardComposer({
  messageId,
  subject,
  from,
  date,
  body,
}: {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  body: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setIsOpen(false);
    setRecipients("");
    setMessage("");
    setError(null);
  }

  async function handleSend() {
    if (!recipients.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendForwardAction(messageId, recipients, message);

    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setRecipients("");
    setMessage("");
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
        Forward
      </button>
    );
  }

  const bodyPreview =
    body.length > 300 ? `${body.slice(0, 300)}…` : body || "(no body extracted)";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
      <p className="text-sm font-medium text-black dark:text-zinc-50">
        Forward
      </p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="forward-recipients"
          className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
        >
          To
        </label>
        <input
          id="forward-recipients"
          type="text"
          value={recipients}
          onChange={(event) => {
            setRecipients(event.target.value);
            setError(null);
          }}
          disabled={isSending}
          placeholder="name@example.com, another@example.com"
          className="w-full rounded-lg border border-black/[.08] bg-white p-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
        />
      </div>

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        disabled={isSending}
        placeholder="Add a message (optional)…"
        className="w-full resize-none rounded-xl border border-black/[.08] bg-white p-3 text-sm leading-6 text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
      />

      <div className="flex flex-col gap-1 rounded-lg border border-black/[.08] bg-zinc-50 p-3 dark:border-white/[.08] dark:bg-zinc-900">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Forwarded content
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          From: {from}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Date: {date}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Subject: {subject}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-xs text-zinc-600 dark:text-zinc-400">
          {bodyPreview}
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={isSending || !recipients.trim()}
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
