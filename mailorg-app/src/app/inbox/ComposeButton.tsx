"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { sendComposeAction } from "./actions";

// Compose isn't tied to any specific opened email, unlike Reply/Forward,
// so it doesn't have a natural inline home on a detail page - it's
// rendered once inside FolderNav (the one persistent nav element present
// on every folder page) as a small self-contained modal, rather than
// requiring every folder page to wire up its own compose state.
//
// Same pattern as ReplyComposer/ForwardComposer otherwise: no optimistic
// UI, isSending disables Send for the whole round-trip to prevent a
// duplicate send from a repeated click.
export function ComposeButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setIsOpen(false);
    setTo("");
    setSubject("");
    setBody("");
    setError(null);
  }

  async function handleSend() {
    if (!to.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    const result = await sendComposeAction(to, subject, body);

    setIsSending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setTo("");
    setSubject("");
    setBody("");
    setIsOpen(false);
    // Sent mail always lands in Sent - navigate there so the send is
    // visibly reflected, rather than refreshing whatever folder Compose
    // happened to be opened from (which might be Trash or Spam).
    router.push("/sent");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-full items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Compose
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.08] dark:bg-zinc-950">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              New message
            </p>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="compose-to"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                To
              </label>
              <input
                id="compose-to"
                type="text"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setError(null);
                }}
                disabled={isSending}
                placeholder="name@example.com, another@example.com"
                className="w-full rounded-lg border border-black/[.08] bg-white p-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="compose-subject"
                className="text-xs font-medium text-zinc-500 dark:text-zinc-400"
              >
                Subject
              </label>
              <input
                id="compose-subject"
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                disabled={isSending}
                placeholder="Subject"
                className="w-full rounded-lg border border-black/[.08] bg-white p-2.5 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={8}
              disabled={isSending}
              placeholder="Write your message…"
              className="w-full resize-none rounded-xl border border-black/[.08] bg-white p-3 text-sm leading-6 text-zinc-900 outline-none transition-colors focus:border-blue-400 disabled:opacity-50 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50"
            />

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !to.trim()}
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
        </div>
      )}
    </>
  );
}
