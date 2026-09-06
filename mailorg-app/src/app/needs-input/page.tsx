import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { getEmailById, type InboxMessage } from "@/lib/gmail";
import { PERSONALIZED_BADGE_STYLES, type EmailAnalysis } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { EmailCard } from "../inbox/InboxEmailList";
import { FolderNav } from "../inbox/FolderNav";
import { ReconnectGoogleButton } from "../inbox/ReconnectGoogleButton";

// Same reasoning as /important: personalized analysis is only ever computed
// lazily when the user opens a specific email, so the working set stays
// small in practice - no background job, no load-more yet. See
// src/app/important/page.tsx for the full rationale.
const MAX_UNCERTAIN_MESSAGES = 50;

function NeedsInputBadge() {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PERSONALIZED_BADGE_STYLES.UNCERTAIN}`}
    >
      Needs your input
    </span>
  );
}

export default async function NeedsInputPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  let error: string | null = null;
  let needsReconnect = false;
  let messages: InboxMessage[] = [];
  let analysisByMessageId = new Map<string, EmailAnalysis>();
  // Distinguishes "MailOrg hasn't formed any opinions yet" from "it has,
  // and nothing is UNCERTAIN right now" - two different empty states.
  let hasAnyPersonalizedAnalysis = false;

  try {
    // Query MailOrg's own judgment first - never Gmail's mailbox - so we
    // only ever fetch the specific messages that could actually appear
    // here, not the whole inbox filtered in memory.
    const uncertainRows = await prisma.personalizedEmailAnalysis.findMany({
      where: { userId, importance: "UNCERTAIN" },
      orderBy: { updatedAt: "desc" },
      take: MAX_UNCERTAIN_MESSAGES,
    });

    hasAnyPersonalizedAnalysis = uncertainRows.length > 0;
    if (!hasAnyPersonalizedAnalysis) {
      const anyAnalysisCount = await prisma.personalizedEmailAnalysis.count({
        where: { userId },
      });
      hasAnyPersonalizedAnalysis = anyAnalysisCount > 0;
    }

    const messageIds = uncertainRows.map((row) => row.messageId);

    if (messageIds.length > 0) {
      // One batch query for general-analysis badge styling, not one per
      // message - avoids an N+1 query for purely decorative data.
      const analysisRecords = await prisma.emailAnalysisRecord.findMany({
        where: { userId, messageId: { in: messageIds } },
      });
      analysisByMessageId = new Map(
        analysisRecords.map((record) => [
          record.messageId,
          {
            priority: record.priority as EmailAnalysis["priority"],
            category: record.category as EmailAnalysis["category"],
            summary: record.summary,
            actionRequired: record.actionRequired,
            action: record.action,
            deadline: record.deadline,
          } satisfies EmailAnalysis,
        ])
      );

      const resolved = await Promise.all(
        messageIds.map(async (messageId) => {
          try {
            return await getEmailById(userId, messageId);
          } catch (err) {
            if (err instanceof GoogleReauthRequiredError) {
              // Systemic - every other lookup will fail the same way, so
              // bubble it up rather than silently rendering an empty list.
              throw err;
            }
            // This one message is unavailable (deleted, permission
            // changed, transient Gmail error, etc.) - skip it, don't
            // break the rest of the page, and don't touch the stored
            // PersonalizedEmailAnalysis row either way.
            console.error(err);
            return null;
          }
        })
      );

      messages = resolved
        .filter((message): message is InboxMessage => message !== null)
        // Most recent Gmail date first - never PersonalizedEmailAnalysis's
        // own createdAt/updatedAt, which reflect when MailOrg analyzed the
        // email, not when it was sent.
        .sort((a, b) => b.internalDate - a.internalDate);
    }
  } catch (err) {
    console.error(err);

    needsReconnect = err instanceof GoogleReauthRequiredError;
    error = needsReconnect
      ? "Your Google account needs to be reconnected to load Needs your input."
      : "We couldn't load your Needs your input emails right now. Please try again shortly.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:flex-row sm:px-12">
      <FolderNav active="/needs-input" />

      <div className="flex flex-1 flex-col gap-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Needs your input
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Emails MailOrg thinks might matter to you, but isn&apos;t sure
            yet.
          </p>
        </div>

        {error && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {needsReconnect && <ReconnectGoogleButton />}
          </div>
        )}

        {!error && messages.length === 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-black dark:text-zinc-50">
              {hasAnyPersonalizedAnalysis
                ? "Nothing needs your attention"
                : "Nothing here yet"}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {hasAnyPersonalizedAnalysis
                ? "MailOrg is confident about the emails it has analyzed so far."
                : "MailOrg will ask for your input when it finds something that might matter to you but isn't sure."}
            </p>
          </div>
        )}

        {!error && messages.length > 0 && (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <EmailCard
                key={message.id}
                message={message}
                analysis={analysisByMessageId.get(message.id)}
                personalizedBadge={<NeedsInputBadge />}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
