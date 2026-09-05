"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateEmailReadStatus } from "./actions";

export function ReadStatusToggle({
  messageId,
  isUnread,
  className = "",
}: {
  messageId: string;
  isUnread: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    setIsPending(true);
    setError(null);

    // isUnread true -> mark it read; isUnread false -> mark it unread.
    const result = await updateEmailReadStatus(messageId, isUnread);

    setIsPending(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="shrink-0 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {isPending ? "Updating…" : isUnread ? "Mark read" : "Mark unread"}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
