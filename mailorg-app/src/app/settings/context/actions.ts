"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { interpretUserContext, type UserContextInterpretation } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const MAX_CONTEXT_LENGTH = 4000;

type ContextActionResult =
  | { success: true }
  | { success: false; error: string };

export interface UserContextRecord {
  contextText: string;
  interpretedContext: UserContextInterpretation | null;
}

function isValidStoredInterpretation(
  value: unknown
): value is UserContextInterpretation {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const isStringArray = (x: unknown) =>
    Array.isArray(x) && x.every((item) => typeof item === "string");

  return (
    isStringArray(v.goals) &&
    isStringArray(v.priorities) &&
    isStringArray(v.lowPrioritySignals) &&
    isStringArray(v.currentContext)
  );
}

// Reads the current user's context (never another user's - userId always
// comes from the session, never a caller-supplied argument). Returns null
// if the user has no context saved yet, not an error. interpretedContext
// is null both when the user has no context yet and for older rows saved
// before interpretation existed - either way there's nothing to show.
export async function getUserContext(): Promise<UserContextRecord | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const record = await prisma.userContext.findUnique({
    where: { userId: session.user.id },
  });

  if (!record) {
    return null;
  }

  return {
    contextText: record.contextText,
    interpretedContext: isValidStoredInterpretation(record.interpretedContext)
      ? record.interpretedContext
      : null,
  };
}

// Creates or updates the current user's context. Validates server-side
// regardless of any client-side checks: must be a non-empty string (after
// trimming) within MAX_CONTEXT_LENGTH. The raw text is never logged.
//
// contextText and interpretedContext are always written together in one
// upsert, and only after interpretation succeeds - never separately. If
// interpretUserContext throws (API error, malformed output, failed
// validation), the save fails as a whole: the previous valid contextText
// and interpretedContext in the database are left untouched rather than
// risking the two falling out of sync.
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

  let interpretedContext: UserContextInterpretation;
  try {
    interpretedContext = await interpretUserContext(trimmed);
  } catch (err) {
    console.error(
      "Failed to interpret user context:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      success: false,
      error: "Couldn't understand your context right now. Please try again.",
    };
  }

  const interpretedContextJson =
    interpretedContext as unknown as Prisma.InputJsonValue;

  try {
    await prisma.userContext.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        contextText: trimmed,
        interpretedContext: interpretedContextJson,
      },
      update: { contextText: trimmed, interpretedContext: interpretedContextJson },
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
