import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { listRecentEmails, type InboxMessage } from "@/lib/gmail";

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
    error =
      err instanceof GoogleReauthRequiredError
        ? "Your Google account needs to be reconnected to load your inbox."
        : "We couldn't load your inbox right now. Please try again shortly.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
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

      {!error && messages.length > 0 && (
        <ul className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.08]">
          {messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-1 py-4">
              <span className="font-medium text-black dark:text-zinc-50">
                {message.subject}
              </span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {message.from}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-500">
                {message.date}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
