"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  archiveEmail,
  markEmailAsSpam,
  setEmailReadStatus,
  setEmailStarred,
  trashEmail,
} from "@/lib/gmail";

type GmailActionResult = { success: true } | { success: false; error: string };

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
