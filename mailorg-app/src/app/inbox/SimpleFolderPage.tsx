import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { listRecentEmails, type InboxMessage } from "@/lib/gmail";
import { FolderNav } from "./FolderNav";
import { InboxEmailList } from "./InboxEmailList";
import { SearchBar } from "./SearchBar";

// Shared implementation for every non-Inbox folder (Sent/Drafts/Spam/Trash).
// Unlike /inbox, these do not run AI analysis - they're plain Gmail-label
// listings reusing the exact same list/detail components. Gmail is the
// source of truth; nothing about folder membership is stored here.
export async function SimpleFolderPage({
  label,
  title,
  activeHref,
  reconnectMessage,
  loadErrorMessage,
  query,
}: {
  label: string;
  title: string;
  activeHref: string;
  reconnectMessage: string;
  loadErrorMessage: string;
  query?: string;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  let messages: InboxMessage[] = [];
  let nextPageToken: string | undefined;
  let error: string | null = null;

  try {
    const result = await listRecentEmails(userId, { labelIds: [label], query });
    messages = result.messages;
    nextPageToken = result.nextPageToken;
  } catch (err) {
    console.error(err);

    error =
      err instanceof GoogleReauthRequiredError
        ? reconnectMessage
        : loadErrorMessage;
  }

  const emails = messages.map((message) => ({
    message,
    analysis: undefined,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:flex-row sm:px-12">
      <FolderNav active={activeHref} />

      <div className="flex flex-1 flex-col gap-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            {title}
          </h1>
          <SearchBar folderPath={activeHref} query={query} />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
            labelIds={[label]}
            query={query}
            analyze={false}
          />
        )}
      </div>
    </div>
  );
}
