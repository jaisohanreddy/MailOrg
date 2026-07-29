import "server-only";

import { getValidGoogleAccessToken } from "@/lib/google-tokens";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface InboxMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
}

interface GmailListResponse {
  messages?: { id: string }[];
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  internalDate?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
}

function getHeader(
  headers: GmailMessageHeader[] | undefined,
  name: string
): string {
  return (
    headers?.find((header) => header.name.toLowerCase() === name.toLowerCase())
      ?.value ?? "(unknown)"
  );
}

// Fetches metadata (subject/sender/date only, no body) for the user's most
// recent inbox messages. No AI processing, no write access - read-only by
// design (see the gmail.readonly scope requested in src/lib/auth.ts).
export async function listRecentEmails(
  userId: string,
  { maxResults = 10 }: { maxResults?: number } = {}
): Promise<InboxMessage[]> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const listUrl = new URL(`${GMAIL_API_BASE}/messages`);
  listUrl.searchParams.set("maxResults", String(maxResults));
  listUrl.searchParams.set("labelIds", "INBOX");

  const listResponse = await fetch(listUrl, { headers: authHeaders });

  if (!listResponse.ok) {
    throw new Error(
      `Gmail API error while listing messages: ${listResponse.status}`
    );
  }

  const { messages = [] } = (await listResponse.json()) as GmailListResponse;

  const fullMessages = await Promise.all(
    messages.map(async ({ id }) => {
      const messageUrl = new URL(`${GMAIL_API_BASE}/messages/${id}`);
      messageUrl.searchParams.set("format", "metadata");
      messageUrl.searchParams.append("metadataHeaders", "Subject");
      messageUrl.searchParams.append("metadataHeaders", "From");

      const messageResponse = await fetch(messageUrl, {
        headers: authHeaders,
      });

      if (!messageResponse.ok) {
        throw new Error(
          `Gmail API error while fetching message ${id}: ${messageResponse.status}`
        );
      }

      return (await messageResponse.json()) as GmailMessageResponse;
    })
  );

  return fullMessages.map((message) => ({
    id: message.id,
    subject: getHeader(message.payload?.headers, "Subject"),
    from: getHeader(message.payload?.headers, "From"),
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toLocaleString()
      : "(unknown)",
  }));
}
