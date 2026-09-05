import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { getEmailById, getEmailThread, type InboxMessage } from "@/lib/gmail";
import { analyzeEmail, type EmailAnalysis } from "@/lib/ai";
import { ArchiveButton } from "../ArchiveButton";
import { ReadStatusToggle } from "../ReadStatusToggle";
import { SpamButton } from "../SpamButton";
import { StarToggle } from "../StarToggle";
import { TrashButton } from "../TrashButton";

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

function BackToInbox() {
  return (
    <Link
      href="/inbox"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Inbox
    </Link>
  );
}

export default async function EmailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const { id } = await params;
  const userId = session.user.id;

  let message: InboxMessage | null = null;
  let error: string | null = null;

  try {
    message = await getEmailById(userId, id);
  } catch (err) {
    console.error(err);

    error =
      err instanceof GoogleReauthRequiredError
        ? "Your Google account needs to be reconnected to load this email."
        : "We couldn't load this email right now. Please try again shortly.";
  }

  // The thread is fetched purely for display - if it fails, fall back to
  // showing just the single opened message rather than a full-page error,
  // since the message itself already loaded successfully.
  let threadMessages: InboxMessage[] = message ? [message] : [];

  if (message) {
    try {
      const thread = await getEmailThread(userId, message.threadId);
      if (thread && thread.messages.length > 0) {
        threadMessages = thread.messages;
      }
    } catch (err) {
      console.error(err);
    }
  }

  let analysis: EmailAnalysis | null = null;
  let analysisError: string | null = null;

  if (message) {
    try {
      analysis = await analyzeEmail(
        {
          id: message.id,
          subject: message.subject,
          from: message.from,
          body: message.body,
        },
        userId
      );
    } catch (err) {
      console.error(err);
      analysisError = "AI analysis is unavailable for this email right now.";
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
        <BackToInbox />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
        <BackToInbox />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          This email couldn&apos;t be found. It may have been deleted, or the
          link may be invalid.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
      <BackToInbox />

      <article
        className={`flex flex-col gap-2 rounded-xl border border-l-4 border-black/[.08] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950 ${
          analysis
            ? PRIORITY_BORDER_STYLES[analysis.priority]
            : "border-l-zinc-200 dark:border-l-zinc-800"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {message.subject}
          </h1>
          <div className="flex items-center gap-1">
            <StarToggle messageId={message.id} isStarred={message.isStarred} />
            <ReadStatusToggle messageId={message.id} isUnread={message.isUnread} />
            <ArchiveButton messageId={message.id} />
            <TrashButton messageId={message.id} />
            <SpamButton messageId={message.id} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <span>{message.from}</span>
          <span aria-hidden="true">•</span>
          <span>{message.date}</span>
        </div>
      </article>

      <section className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          AI Analysis
        </h2>

        {analysisError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {analysisError}
          </p>
        )}

        {analysis && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${PRIORITY_BADGE_STYLES[analysis.priority]}`}
              >
                {analysis.priority} priority
              </span>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {analysis.category}
              </span>
            </div>

            {analysis.summary && (
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {analysis.summary}
              </p>
            )}

            {analysis.actionRequired && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Action needed
                </p>
                {analysis.action && (
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                    {analysis.action}
                  </p>
                )}
                {analysis.deadline && (
                  <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    Deadline: {analysis.deadline}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Conversation
          {threadMessages.length > 1 && ` (${threadMessages.length} messages)`}
        </h2>

        <div className="flex flex-col gap-4">
          {threadMessages.map((threadMessage) => {
            const isOpenedMessage = threadMessage.id === message.id;
            const threadMessageBody =
              threadMessage.body || "(no body extracted)";

            return (
              <div
                key={threadMessage.id}
                className={`flex flex-col gap-2 rounded-lg border p-4 ${
                  isOpenedMessage
                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10"
                    : "border-black/[.08] dark:border-white/[.08]"
                }`}
              >
                <div className="flex flex-col gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      {threadMessage.from}
                    </span>
                    <span aria-hidden="true">•</span>
                    <span>{threadMessage.date}</span>
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">
                    To: {threadMessage.to}
                  </span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {threadMessageBody}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
