"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  archiveEmail,
  BASIC_EMAIL_PATTERN,
  listRecentEmails,
  markEmailAsSpam,
  sendForward,
  sendReply,
  setEmailReadStatus,
  setEmailStarred,
  trashEmail,
  type InboxMessage,
} from "@/lib/gmail";
import { analyzeEmails, type EmailAnalysis } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { EmailFeedbackDecision } from "@/generated/prisma/client";
import type { EmailFeedbackDecision as FeedbackDecision } from "@/generated/prisma/client";

type GmailActionResult = { success: true } | { success: false; error: string };

type LoadMoreResult =
  | {
      success: true;
      emails: { message: InboxMessage; analysis: EmailAnalysis | undefined }[];
      nextPageToken?: string;
    }
  | { success: false; error: string };

// Marks a message read/unread on the real Gmail account. Returns a typed
// result instead of throwing so the calling UI can show a clean error
// message rather than crash, and only revalidates (reflecting the change)
// after the Gmail write actually succeeds.
export async function updateEmailReadStatus(
  messageId: string,
  markAsRead: boolean
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await setEmailReadStatus(session.user.id, messageId, markAsRead);
  } catch (err) {
    console.error(
      "Failed to update Gmail read status:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't update this email on Gmail. Please try again.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${messageId}`);

  return { success: true };
}

// Archives a message on the real Gmail account (removes it from INBOX
// without deleting it or moving it to Trash/Spam). Same pattern as the
// other Gmail actions: typed result instead of throwing, and revalidates
// /inbox so the archived message disappears from the list on next render.
export async function archiveEmailAction(
  messageId: string
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await archiveEmail(session.user.id, messageId);
  } catch (err) {
    console.error(
      "Failed to archive Gmail message:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't archive this email on Gmail. Please try again.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${messageId}`);

  return { success: true };
}

// Moves a message to Gmail Trash (not permanent deletion). Same pattern as
// the other Gmail actions: typed result instead of throwing, and
// revalidates /inbox so the trashed message disappears from the list.
export async function trashEmailAction(
  messageId: string
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await trashEmail(session.user.id, messageId);
  } catch (err) {
    console.error(
      "Failed to trash Gmail message:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't move this email to Trash. Please try again.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${messageId}`);

  return { success: true };
}

// Marks a message as spam on the real Gmail account (not permanent
// deletion). Same pattern as the other Gmail actions: typed result instead
// of throwing, and revalidates /inbox so the message disappears from the
// list.
export async function markEmailAsSpamAction(
  messageId: string
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await markEmailAsSpam(session.user.id, messageId);
  } catch (err) {
    console.error(
      "Failed to mark Gmail message as spam:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't mark this email as spam. Please try again.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${messageId}`);

  return { success: true };
}

// Fetches the next Gmail page for a given folder/query (a genuine
// server-side Gmail page fetch via pageToken, never a slice of an
// already-fetched array). The caller is responsible for appending the
// returned emails to what's already displayed - this only ever returns
// one new page. When `analyze` is true (Inbox only), runs AI analysis on
// just this new batch, reusing the existing per-message cache exactly as
// the initial page load does; already-displayed/cached messages are never
// touched since they're never included in this call's `messages`.
export async function loadMoreEmails({
  labelIds,
  query,
  pageToken,
  analyze,
}: {
  labelIds: string[];
  query?: string;
  pageToken: string;
  analyze: boolean;
}): Promise<LoadMoreResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    const { messages, nextPageToken } = await listRecentEmails(
      session.user.id,
      { labelIds, query, pageToken }
    );

    const analysisByMessageId =
      analyze && messages.length > 0
        ? await analyzeEmails(messages, session.user.id)
        : new Map<string, EmailAnalysis>();

    const emails = messages.map((message) => ({
      message,
      analysis: analysisByMessageId.get(message.id),
    }));

    return { success: true, emails, nextPageToken };
  } catch (err) {
    console.error(
      "Failed to load more emails:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't load more emails. Please try again.",
    };
  }
}

// Stars/unstars a message on the real Gmail account. Same pattern as
// updateEmailReadStatus: typed result instead of throwing, only revalidates
// after the Gmail write actually succeeds.
export async function updateEmailStarredStatus(
  messageId: string,
  starred: boolean
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await setEmailStarred(session.user.id, messageId, starred);
  } catch (err) {
    console.error(
      "Failed to update Gmail starred status:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't update this email on Gmail. Please try again.",
    };
  }

  revalidatePath("/inbox");
  revalidatePath(`/inbox/${messageId}`);

  return { success: true };
}

// Records (or updates) the current user's own explicit importance judgment
// for one Gmail message. This is purely a behavioral-signal write: it never
// calls the Gmail API, never touches Gmail labels, never re-runs AI
// analysis, and never modifies UserContext - it only persists the
// judgment itself. userId always comes from the session, never the caller.
export async function setEmailImportanceFeedback(
  messageId: string,
  decision: FeedbackDecision
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  if (typeof messageId !== "string" || !messageId.trim()) {
    return { success: false, error: "A valid email is required." };
  }

  if (!Object.values(EmailFeedbackDecision).includes(decision)) {
    return { success: false, error: "Invalid feedback value." };
  }

  try {
    await prisma.emailFeedback.upsert({
      where: {
        userId_messageId: { userId: session.user.id, messageId },
      },
      create: { userId: session.user.id, messageId, decision },
      update: { decision },
    });
  } catch (err) {
    console.error(
      "Failed to save email importance feedback:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't save your feedback. Please try again.",
    };
  }

  revalidatePath(`/inbox/${messageId}`);
  return { success: true };
}

// Reads the current user's existing feedback for one message, if any.
// Returns null both when unauthenticated and when there's simply no
// feedback yet - "nothing recorded" is the normal case, not an error.
export async function getEmailImportanceFeedback(
  messageId: string
): Promise<FeedbackDecision | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  if (typeof messageId !== "string" || !messageId.trim()) {
    return null;
  }

  const record = await prisma.emailFeedback.findUnique({
    where: {
      userId_messageId: { userId: session.user.id, messageId },
    },
  });

  return record?.decision ?? null;
}

// Sends a plain-text reply to an existing Gmail message, threaded into the
// same conversation. Validates inputs server-side regardless of any
// client-side checks; messageId/body are never trusted as authoritative
// from the browser beyond identifying what to reply to and what to say -
// the actual recipient/subject/threading are re-derived from Gmail itself
// inside sendReply.
export async function sendReplyAction(
  messageId: string,
  body: string
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  if (typeof messageId !== "string" || !messageId.trim()) {
    return { success: false, error: "A valid email is required." };
  }

  if (typeof body !== "string" || !body.trim()) {
    return { success: false, error: "Reply can't be empty." };
  }

  try {
    await sendReply(session.user.id, messageId, body.trim());
  } catch (err) {
    console.error(
      "Failed to send reply:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't send your reply. Please try again.",
    };
  }

  revalidatePath(`/inbox/${messageId}`);
  return { success: true };
}

// Forwards an existing message to one or more recipients as a brand-new
// outgoing message (never threaded onto the original conversation - see
// sendForward). recipients is a single comma-separated string from the
// composer's text input; message is the optional note shown above the
// forwarded content. Recipient format is validated here (a clear rejection
// with an error message) rather than silently dropping bad addresses.
export async function sendForwardAction(
  messageId: string,
  recipients: string,
  message: string
): Promise<GmailActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  if (typeof messageId !== "string" || !messageId.trim()) {
    return { success: false, error: "A valid email is required." };
  }

  if (typeof recipients !== "string") {
    return { success: false, error: "At least one recipient is required." };
  }

  const recipientList = recipients
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.length > 0);

  if (recipientList.length === 0) {
    return { success: false, error: "At least one recipient is required." };
  }

  const invalidRecipient = recipientList.find(
    (address) => !BASIC_EMAIL_PATTERN.test(address)
  );
  if (invalidRecipient) {
    return {
      success: false,
      error: `"${invalidRecipient}" doesn't look like a valid email address.`,
    };
  }

  try {
    await sendForward(
      session.user.id,
      messageId,
      recipientList,
      typeof message === "string" ? message : ""
    );
  } catch (err) {
    console.error(
      "Failed to forward email:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't forward this email. Please try again.",
    };
  }

  revalidatePath(`/inbox/${messageId}`);
  return { success: true };
}
