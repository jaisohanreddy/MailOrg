"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

import { markEmailAsSpamAction } from "./actions";

export function SpamButton({
  messageId,
  className = "",
}: {
  messageId: string;
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

    const result = await markEmailAsSpamAction(messageId);

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
        aria-label="Mark this email as spam"
        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
