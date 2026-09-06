import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { getEmailById, getEmailThread, type InboxMessage } from "@/lib/gmail";
import {
  analyzeEmail,
  analyzeEmailPersonalized,
  type EmailAnalysis,
  type PersonalizedAnalysisResult,
} from "@/lib/ai";
import { ArchiveButton } from "../ArchiveButton";
import { getEmailImportanceFeedback } from "../actions";
import { EmailFeedbackControl } from "../EmailFeedbackControl";
import { ReadStatusToggle } from "../ReadStatusToggle";
import { ReconnectGoogleButton } from "../ReconnectGoogleButton";
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

const PERSONALIZED_BADGE_STYLES: Record<
  PersonalizedAnalysisResult["importance"],
  string
> = {
  IMPORTANT:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  NOT_IMPORTANT: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  UNCERTAIN:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const PERSONALIZED_BADGE_LABELS: Record<
  PersonalizedAnalysisResult["importance"],
  string
> = {
  IMPORTANT: "Important to you",
  NOT_IMPORTANT: "Not important",
  UNCERTAIN: "Uncertain",
};

const PERSONALIZED_INTRO: Record<
  PersonalizedAnalysisResult["importance"],
  string
> = {
  IMPORTANT: "Important to you based on your current context.",
  NOT_IMPORTANT: "Not important based on your current context.",
  UNCERTAIN:
    "Potentially important, but I don't have enough information from " +
    "your context to know whether this type of email matters to you.",
};

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  let needsReconnect = false;

  try {
    message = await getEmailById(userId, id);
  } catch (err) {
    console.error(err);

    needsReconnect = err instanceof GoogleReauthRequiredError;
    error = needsReconnect
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

  const feedback = message
    ? await getEmailImportanceFeedback(message.id)
    : null;

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

  // Personalization is derived from the user's own UserContext plus the
  // general analysis above - never Gmail history, never EmailFeedback (a
  // later phase). null means either there's no UserContext yet or
  // analysis failed; either way there's nothing to show.
  let personalized: PersonalizedAnalysisResult | null = null;

  if (message && analysis) {
    try {
      personalized = await analyzeEmailPersonalized(
        userId,
        {
          id: message.id,
          subject: message.subject,
          from: message.from,
          body: message.body,
        },
        analysis
      );
    } catch (err) {
      console.error(err);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
        <BackToInbox />
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          {needsReconnect && <ReconnectGoogleButton />}
        </div>
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

      <EmailFeedbackControl messageId={message.id} currentDecision={feedback} />

      {personalized && (
        <section className="flex flex-col gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-6 dark:border-blue-900/40 dark:bg-blue-950/20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            MailOrg
          </h2>
          <span
            className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${PERSONALIZED_BADGE_STYLES[personalized.importance]}`}
          >
            {PERSONALIZED_BADGE_LABELS[personalized.importance]}
          </span>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {PERSONALIZED_INTRO[personalized.importance]}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {personalized.reason}
          </p>
          {personalized.importance === "UNCERTAIN" && (
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              Use the buttons above to tell MailOrg whether this matters to
              you.
            </p>
          )}
        </section>
      )}

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

                {threadMessage.attachments.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 border-t border-black/[.08] pt-3 dark:border-white/[.08]">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Attachments
                    </h3>
                    <ul className="flex flex-col gap-1.5">
                      {threadMessage.attachments.map((attachment) => (
                        <li
                          key={attachment.partId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/[.08] bg-zinc-50 px-3 py-2 text-sm dark:border-white/[.08] dark:bg-zinc-900"
                        >
                          <span className="truncate text-zinc-700 dark:text-zinc-300">
                            {attachment.filename}
                            {attachment.size > 0 && (
                              <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-600">
                                {formatFileSize(attachment.size)}
                              </span>
                            )}
                          </span>
                          <a
                            href={`/api/attachments/${threadMessage.id}/${attachment.partId}`}
                            className="shrink-0 rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                          >
                            Download
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
