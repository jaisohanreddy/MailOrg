import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { listRecentEmails, type InboxMessage } from "@/lib/gmail";
import { analyzeEmails, type EmailAnalysis } from "@/lib/ai";
import { InboxEmailList } from "./InboxEmailList";

export default async function InboxPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  let messages: InboxMessage[] = [];
  let error: string | null = null;

  try {
    messages = await listRecentEmails(userId);
  } catch (err) {
  console.error(err);

  error =
    err instanceof GoogleReauthRequiredError
      ? "Your Google account needs to be reconnected to load your inbox."
      : "We couldn't load your inbox right now. Please try again shortly.";
}

  const analysisByMessageId =
    !error && messages.length > 0
      ? await analyzeEmails(messages, userId)
      : new Map<string, EmailAnalysis>();

  const emails = messages.map((message) => ({
    message,
    analysis: analysisByMessageId.get(message.id),
  }));

  return (
    <div className="flex flex-1 flex-col gap-10 px-6 py-10 sm:px-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Inbox
      </h1>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!error && messages.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No messages found.
        </p>
      )}

      {!error && messages.length > 0 && <InboxEmailList emails={emails} />}
    </div>
  );
}
