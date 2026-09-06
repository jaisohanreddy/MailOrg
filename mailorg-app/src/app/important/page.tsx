import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { getEmailById, type InboxMessage } from "@/lib/gmail";
import {
  PERSONALIZED_BADGE_LABELS,
  PERSONALIZED_BADGE_STYLES,
  type EmailAnalysis,
} from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { EmailCard } from "../inbox/InboxEmailList";
import { FolderNav } from "../inbox/FolderNav";
import { ReconnectGoogleButton } from "../inbox/ReconnectGoogleButton";

// Caps how many IMPORTANT rows this first implementation will resolve
// against Gmail per load. Personalized analysis is only ever computed
// lazily when the user opens a specific email (see analyzeEmailPersonalized
// in src/lib/ai.ts) - there's no background job populating this table - so
// in practice the working set stays small. No load-more yet: paginating
// this list correctly would mean paginating already-resolved Gmail dates,
// which needs the messages resolved first anyway, so a naive DB-cursor
// pagination wouldn't actually save the work it's meant to save. A real
// paginated version is a reasonable follow-up once this list can grow large.
const MAX_IMPORTANT_MESSAGES = 50;

function PersonalizedBadge({ importance }: { importance: "IMPORTANT" }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${PERSONALIZED_BADGE_STYLES[importance]}`}
    >
      {PERSONALIZED_BADGE_LABELS[importance]}
    </span>
  );
}

export default async function ImportantPage() {
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
  // and none of them are IMPORTANT right now" - two different empty states.
  let hasAnyPersonalizedAnalysis = false;

  try {
    // Query MailOrg's own judgment first - never Gmail's mailbox - so we
    // only ever fetch the specific messages that could actually appear
    // here, not the whole inbox filtered in memory.
    const importantRows = await prisma.personalizedEmailAnalysis.findMany({
      where: { userId, importance: "IMPORTANT" },
      orderBy: { updatedAt: "desc" },
      take: MAX_IMPORTANT_MESSAGES,
    });

    hasAnyPersonalizedAnalysis = importantRows.length > 0;
    if (!hasAnyPersonalizedAnalysis) {
      const anyAnalysisCount = await prisma.personalizedEmailAnalysis.count({
        where: { userId },
      });
      hasAnyPersonalizedAnalysis = anyAnalysisCount > 0;
    }

    const messageIds = importantRows.map((row) => row.messageId);

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
            // break the rest of the page.
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
      ? "Your Google account needs to be reconnected to load Important for you."
      : "We couldn't load your Important for you emails right now. Please try again shortly.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:flex-row sm:px-12">
      <FolderNav active="/important" />

      <div className="flex flex-1 flex-col gap-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Important for you
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Emails MailOrg thinks matter to you based on your current
            priorities.
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
                ? "You're all caught up"
                : "Nothing here yet"}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {hasAnyPersonalizedAnalysis
                ? "MailOrg doesn't currently see any emails that match your priorities."
                : "MailOrg will surface emails that matter to you as it understands your priorities."}
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
                personalizedBadge={<PersonalizedBadge importance="IMPORTANT" />}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
