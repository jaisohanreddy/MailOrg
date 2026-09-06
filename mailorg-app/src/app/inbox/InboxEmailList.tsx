"use client";

import { useState } from "react";
import Link from "next/link";

import type { InboxMessage } from "@/lib/gmail";
import type { EmailAnalysis } from "@/lib/ai";
import { ArchiveButton } from "./ArchiveButton";
import { loadMoreEmails } from "./actions";
import { ReadStatusToggle } from "./ReadStatusToggle";
import { SpamButton } from "./SpamButton";
import { StarToggle } from "./StarToggle";
import { TrashButton } from "./TrashButton";

const PRIORITY_BADGE_STYLES: Record<EmailAnalysis["priority"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
};

const PRIORITY_BORDER_STYLES: Record<EmailAnalysis["priority"], string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-400",
  low: "border-l-zinc-300 dark:border-l-zinc-700",
};

type FilterKey = "all" | "needsAttention" | "high" | "medium" | "low";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needsAttention", label: "Needs Attention" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
];

function matchesFilter(
  filter: FilterKey,
  analysis: EmailAnalysis | undefined
): boolean {
  if (filter === "all") return true;
  if (!analysis) return false;
  if (filter === "needsAttention") {
    return analysis.priority === "high" || analysis.actionRequired === true;
  }
  return analysis.priority === filter;
}

export function EmailCard({
  message,
  analysis,
  personalizedBadge,
}: {
  message: InboxMessage;
  analysis: EmailAnalysis | undefined;
  personalizedBadge?: React.ReactNode;
}) {
  const bodyPreview = message.body
    ? `${message.body.slice(0, 200)}${message.body.length > 200 ? "…" : ""}`
    : "(no body extracted)";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-l-4 border-black/[.08] bg-white p-4 transition hover:border-black/[.15] hover:bg-zinc-50 dark:border-white/[.08] dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
        analysis
          ? PRIORITY_BORDER_STYLES[analysis.priority]
          : "border-l-zinc-200 dark:border-l-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <Link href={`/inbox/${message.id}`} className="flex flex-1 flex-col gap-2">
          {(personalizedBadge || analysis) && (
            <div className="flex flex-wrap items-center gap-2">
              {personalizedBadge}
              {analysis && (
                <>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE_STYLES[analysis.priority]}`}
                  >
                    {analysis.priority} priority
                  </span>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {analysis.category}
                  </span>
                  {analysis.actionRequired && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Action needed
                      {analysis.action ? `: ${analysis.action}` : ""}
                      {analysis.deadline ? ` (by ${analysis.deadline})` : ""}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <span
            className={`text-black dark:text-zinc-50 ${message.isUnread ? "font-semibold" : "font-normal"}`}
          >
            {message.subject}
          </span>

          {analysis?.summary && (
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {analysis.summary}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <span>{message.from}</span>
            <span aria-hidden="true">•</span>
            <span>{message.date}</span>
          </div>

          <span className="text-xs text-zinc-400 dark:text-zinc-600">
            {bodyPreview}
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <StarToggle messageId={message.id} isStarred={message.isStarred} />
          <ReadStatusToggle messageId={message.id} isUnread={message.isUnread} />
          <ArchiveButton messageId={message.id} />
          <TrashButton messageId={message.id} />
          <SpamButton messageId={message.id} />
        </div>
      </div>
    </div>
  );
}

export function InboxEmailList({
  emails,
  nextPageToken: initialNextPageToken,
  labelIds,
  query,
  analyze,
}: {
  emails: { message: InboxMessage; analysis: EmailAnalysis | undefined }[];
  nextPageToken?: string;
  labelIds: string[];
  query?: string;
  analyze: boolean;
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState(emails);
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const filtered = items.filter(({ analysis }) =>
    matchesFilter(activeFilter, analysis)
  );

  async function handleLoadMore() {
    if (!nextPageToken) return;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    const result = await loadMoreEmails({
      labelIds,
      query,
      pageToken: nextPageToken,
      analyze,
    });

    setIsLoadingMore(false);

    if (!result.success) {
      setLoadMoreError(result.error);
      return;
    }

    // Append the new page after what's already displayed - never replace.
    setItems((prev) => [...prev, ...result.emails]);
    setNextPageToken(result.nextPageToken);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveFilter(key)}
            aria-pressed={activeFilter === key}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              activeFilter === key
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No emails match this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(({ message, analysis }) => (
            <EmailCard key={message.id} message={message} analysis={analysis} />
          ))}
        </div>
      )}

      {nextPageToken && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
          {loadMoreError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {loadMoreError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
