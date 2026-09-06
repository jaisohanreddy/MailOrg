import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { listRecentEmails, type InboxMessage } from "@/lib/gmail";
import { analyzeEmails, type EmailAnalysis } from "@/lib/ai";
import { FolderNav } from "./FolderNav";
import { InboxEmailList } from "./InboxEmailList";
import { ReconnectGoogleButton } from "./ReconnectGoogleButton";
import { SearchBar } from "./SearchBar";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" && q.trim() ? q.trim() : undefined;

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  let messages: InboxMessage[] = [];
  let nextPageToken: string | undefined;
  let error: string | null = null;
  let needsReconnect = false;

  try {
    const result = await listRecentEmails(userId, { query });
    messages = result.messages;
    nextPageToken = result.nextPageToken;
  } catch (err) {
    console.error(err);

    needsReconnect = err instanceof GoogleReauthRequiredError;
    error = needsReconnect
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
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:flex-row sm:px-12">
      <FolderNav active="/inbox" />

      <div className="flex flex-1 flex-col gap-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Inbox
          </h1>
          <SearchBar folderPath="/inbox" query={query} />
        </div>

        {error && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            {needsReconnect && <ReconnectGoogleButton />}
          </div>
        )}

        {!error && messages.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No messages found.
          </p>
        )}

        {!error && messages.length > 0 && (
          <InboxEmailList
            emails={emails}
            nextPageToken={nextPageToken}
            labelIds={["INBOX"]}
            query={query}
            analyze
          />
        )}
      </div>
    </div>
  );
}
