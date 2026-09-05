"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

import { updateEmailStarredStatus } from "./actions";

export function StarToggle({
  messageId,
  isStarred,
  className = "",
}: {
  messageId: string;
  isStarred: boolean;
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

    const result = await updateEmailStarredStatus(messageId, !isStarred);

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
        aria-pressed={isStarred}
        aria-label={isStarred ? "Unstar this email" : "Star this email"}
        className="rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-zinc-800"
      >
        <Star
          className={`h-4 w-4 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`}
        />
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
