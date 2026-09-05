"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_CONTEXT_LENGTH = 4000;

type ContextActionResult =
  | { success: true }
  | { success: false; error: string };

// Reads the current user's context (never another user's - userId always
// comes from the session, never a caller-supplied argument). Returns null
// if the user has no context saved yet, not an error.
export async function getUserContext(): Promise<string | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const record = await prisma.userContext.findUnique({
    where: { userId: session.user.id },
  });

  return record?.contextText ?? null;
}

// Creates or updates the current user's context. Validates server-side
// regardless of any client-side checks: must be a non-empty string (after
// trimming) within MAX_CONTEXT_LENGTH. The raw text is never logged.
export async function saveUserContext(
  contextText: string
): Promise<ContextActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  if (typeof contextText !== "string") {
    return { success: false, error: "Context must be text." };
  }

  const trimmed = contextText.trim();

  if (!trimmed) {
    return { success: false, error: "Context can't be empty." };
  }

  if (trimmed.length > MAX_CONTEXT_LENGTH) {
    return {
      success: false,
      error: `Context must be ${MAX_CONTEXT_LENGTH} characters or fewer (currently ${trimmed.length}).`,
    };
  }

  try {
    await prisma.userContext.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, contextText: trimmed },
      update: { contextText: trimmed },
    });
  } catch (err) {
    console.error(
      "Failed to save user context:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't save your context. Please try again.",
    };
  }

  revalidatePath("/settings/context");
  return { success: true };
}

// Deletes only the current user's context. deleteMany (rather than delete)
// so calling this when no context exists is a harmless no-op instead of a
// P2025 "record not found" error.
export async function deleteUserContext(): Promise<ContextActionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "You need to be signed in to do that." };
  }

  try {
    await prisma.userContext.deleteMany({
      where: { userId: session.user.id },
    });
  } catch (err) {
    console.error(
      "Failed to delete user context:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't delete your context. Please try again.",
    };
  }

  revalidatePath("/settings/context");
  return { success: true };
}
