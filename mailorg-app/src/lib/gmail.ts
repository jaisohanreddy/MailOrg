import "server-only";

import { getValidGoogleAccessToken } from "@/lib/google-tokens";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface InboxMessage {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
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
  snippet?: string;
  payload?: {
    mimeType?: string;
    headers?: GmailMessageHeader[];
    body?: {
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

interface GmailMessagePart {
  mimeType?: string;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
}

// Performs an authenticated Gmail API GET, retrying once with a forced
// token refresh if Google rejects the cached access token (401) even
// though our locally stored expires_at said it was still valid - Google
// can invalidate a token before its nominal expiry, so that timestamp
// alone can't be fully trusted.
async function fetchGmail(userId: string, url: URL): Promise<Response> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status !== 401) {
    return response;
  }

  const freshAccessToken = await getValidGoogleAccessToken(userId, {
    forceRefresh: true,
  });
  return fetch(url, {
    headers: { Authorization: `Bearer ${freshAccessToken}` },
  });
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

// Gmail encodes body data as base64url (RFC 4648 §5), not standard base64.
function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

// Converts an HTML email body into readable plain text for preview/AI
// input - strips markup rather than displaying raw "<!DOCTYPE html>..." tags.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

// Some senders mislabel HTML content as text/plain (a template bug on
// their end, not something the mimeType field reveals). Detects that case
// so it can be routed through the same HTML-to-plain-text conversion
// instead of being trusted blindly.
function looksLikeHtml(text: string): boolean {
  const sample = text.slice(0, 500).toLowerCase();
  return sample.includes("<!doctype html") || sample.includes("<html");
}

// Recursively walks Gmail's nested MIME part tree looking for a part with
// the given mimeType that actually carries body data.
function findMimePart(
  part: GmailMessagePart | undefined,
  mimeType: string
): GmailMessagePart | undefined {
  if (!part) return undefined;

  if (part.mimeType === mimeType && part.body?.data) {
    return part;
  }

  for (const child of part.parts ?? []) {
    const found = findMimePart(child, mimeType);
    if (found) return found;
  }

  return undefined;
}

// Extracts the message body, preferring text/plain over text/html, and
// falling back to whatever body data is present at the top level. Returns
// an empty string rather than throwing if no body can be found.
function extractBody(payload: GmailMessageResponse["payload"]): string {
  if (!payload) return "";

  const plainPart = findMimePart(payload, "text/plain");
  if (plainPart?.body?.data) {
    const decoded = decodeBase64Url(plainPart.body.data);
    return looksLikeHtml(decoded) ? htmlToPlainText(decoded) : decoded;
  }

  const htmlPart = findMimePart(payload, "text/html");
  if (htmlPart?.body?.data) {
    return htmlToPlainText(decodeBase64Url(htmlPart.body.data));
  }

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html" || looksLikeHtml(decoded)
      ? htmlToPlainText(decoded)
      : decoded;
  }

  return "";
}

// Shared mapping from the raw Gmail message shape to our InboxMessage type,
// reused by both listRecentEmails and getEmailById so header/body parsing
// only lives in one place.
function toInboxMessage(message: GmailMessageResponse): InboxMessage {
  return {
    id: message.id,
    subject: getHeader(message.payload?.headers, "Subject"),
    from: getHeader(message.payload?.headers, "From"),
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toLocaleString()
      : "(unknown)",
    body: extractBody(message.payload),
  };
}

// Fetches the user's most recent inbox messages, including their decoded
// text body. No AI processing, no write access - read-only by design (see
// the gmail.readonly scope requested in src/lib/auth.ts).
export async function listRecentEmails(
  userId: string,
  { maxResults = 10 }: { maxResults?: number } = {}
): Promise<InboxMessage[]> {
  const listUrl = new URL(`${GMAIL_API_BASE}/messages`);
  listUrl.searchParams.set("maxResults", String(maxResults));
  listUrl.searchParams.set("labelIds", "INBOX");

  const listResponse = await fetchGmail(userId, listUrl);

  if (!listResponse.ok) {
    throw new Error(
      `Gmail API error while listing messages: ${listResponse.status}`
    );
  }

  const { messages = [] } = (await listResponse.json()) as GmailListResponse;

  const fullMessages = await Promise.all(
    messages.map(async ({ id }) => {
      const messageUrl = new URL(`${GMAIL_API_BASE}/messages/${id}`);
      messageUrl.searchParams.set("format", "full");

      const messageResponse = await fetchGmail(userId, messageUrl);

      if (!messageResponse.ok) {
        throw new Error(
          `Gmail API error while fetching message ${id}: ${messageResponse.status}`
        );
      }

      return (await messageResponse.json()) as GmailMessageResponse;
    })
  );

  return fullMessages.map(toInboxMessage);
}

// Fetches a single message by id, e.g. for the email detail page. Reuses
// the same header/body extraction as listRecentEmails. Returns null if the
// message doesn't exist (or isn't accessible to this user) instead of
// throwing, so callers can render a clear "not found" state.
export async function getEmailById(
  userId: string,
  messageId: string
): Promise<InboxMessage | null> {
  const messageUrl = new URL(`${GMAIL_API_BASE}/messages/${messageId}`);
  messageUrl.searchParams.set("format", "full");

  const messageResponse = await fetchGmail(userId, messageUrl);

  if (messageResponse.status === 404) {
    return null;
  }

  if (!messageResponse.ok) {
    throw new Error(
      `Gmail API error while fetching message ${messageId}: ${messageResponse.status}`
    );
  }

  const message = (await messageResponse.json()) as GmailMessageResponse;
  return toInboxMessage(message);
}
