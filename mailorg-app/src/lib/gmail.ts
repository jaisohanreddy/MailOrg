import "server-only";

import { getValidGoogleAccessToken } from "@/lib/google-tokens";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// Identified by partId (a part's stable position in the MIME tree, e.g.
// "1" or "0.1"), not Gmail's attachmentId - Gmail mints a fresh attachmentId
// on every messages.get call, so one captured at page-render time is no
// longer valid by the time a later download request re-fetches the message.
// partId stays the same across fetches, so it's what the UI/download route
// use to identify "this attachment", with the actual (current) attachmentId
// resolved fresh at download time.
export interface AttachmentMeta {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface InboxMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  // Raw ms-since-epoch, alongside the formatted `date` string above - needed
  // whenever messages must be sorted chronologically (e.g. the Important
  // for you view, which orders by Gmail date after resolving messages out
  // of DB order). The formatted string isn't safely sortable.
  internalDate: number;
  body: string;
  isUnread: boolean;
  isStarred: boolean;
  attachments: AttachmentMeta[];
}

interface GmailListResponse {
  messages?: { id: string }[];
  nextPageToken?: string;
}

export interface ListEmailsResult {
  messages: InboxMessage[];
  nextPageToken?: string;
}

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessageResponse {
  id: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  labelIds?: string[];
  payload?: {
    partId?: string;
    mimeType?: string;
    filename?: string;
    headers?: GmailMessageHeader[];
    body?: {
      attachmentId?: string;
      size?: number;
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

interface GmailMessagePart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

// Performs an authenticated Gmail API GET, retrying once with a forced
// token refresh if Google rejects the cached access token (401) even
// though our locally stored expires_at said it was still valid - Google
// can invalidate a token before its nominal expiry, so that timestamp
// alone can't be fully trusted.
async function fetchGmail(
  userId: string,
  url: URL,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const response = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });

  if (response.status !== 401) {
    return response;
  }

  const freshAccessToken = await getValidGoogleAccessToken(userId, {
    forceRefresh: true,
  });
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${freshAccessToken}` },
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

// Internal shape used only while resolving a download - includes the
// current-fetch's attachmentId, unlike the public AttachmentMeta which
// deliberately omits it (see AttachmentMeta's comment).
interface AttachmentPart {
  partId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

// Recursively walks Gmail's nested MIME part tree collecting attachments.
// A part is only treated as a downloadable attachment when Gmail provides
// a filename and an attachmentId - inline text/html body parts carry their
// data directly (no attachmentId) and multipart containers (mixed/
// alternative/related) carry neither, so both are naturally skipped while
// recursion continues into their children.
function findAttachmentParts(
  part: GmailMessageResponse["payload"] | GmailMessagePart | undefined
): AttachmentPart[] {
  if (!part) return [];

  const attachments: AttachmentPart[] = [];

  if (part.filename && part.body?.attachmentId) {
    attachments.push({
      partId: part.partId ?? "",
      attachmentId: part.body.attachmentId,
      filename: part.filename,
      mimeType: part.mimeType || "application/octet-stream",
      size: part.body.size ?? 0,
    });
  }

  for (const child of part.parts ?? []) {
    attachments.push(...findAttachmentParts(child));
  }

  return attachments;
}

function toAttachmentMeta(part: AttachmentPart): AttachmentMeta {
  return {
    partId: part.partId,
    filename: part.filename,
    mimeType: part.mimeType,
    size: part.size,
  };
}

// Shared mapping from the raw Gmail message shape to our InboxMessage type,
// reused by both listRecentEmails and getEmailById so header/body parsing
// only lives in one place.
function toInboxMessage(message: GmailMessageResponse): InboxMessage {
  return {
    id: message.id,
    threadId: message.threadId ?? message.id,
    subject: getHeader(message.payload?.headers, "Subject"),
    from: getHeader(message.payload?.headers, "From"),
    to: getHeader(message.payload?.headers, "To"),
    date: message.internalDate
      ? new Date(Number(message.internalDate)).toLocaleString()
      : "(unknown)",
    internalDate: Number(message.internalDate ?? 0),
    body: extractBody(message.payload),
    isUnread: (message.labelIds ?? []).includes("UNREAD"),
    isStarred: (message.labelIds ?? []).includes("STARRED"),
    attachments: findAttachmentParts(message.payload).map(toAttachmentMeta),
  };
}

// Fetches one page of the user's most recent messages for the given Gmail
// label(s) (INBOX by default), optionally constrained by a Gmail search
// query (the same "q" syntax as Gmail's own search bar - passed through
// verbatim, no custom parsing) and/or a Gmail pageToken to continue from a
// previous page, including each message's decoded text body. Pagination is
// performed entirely by Gmail - this never fetches more than one page or
// slices an already-fetched array. No AI processing, no write access for
// listing - read-only by design (see the gmail.readonly scope requested in
// src/lib/auth.ts). Gmail remains the source of truth for folder
// membership, search results, and paging; nothing here is duplicated into
// the database.
export async function listRecentEmails(
  userId: string,
  {
    maxResults = 10,
    labelIds = ["INBOX"],
    query,
    pageToken,
  }: {
    maxResults?: number;
    labelIds?: string[];
    query?: string;
    pageToken?: string;
  } = {}
): Promise<ListEmailsResult> {
  const listUrl = new URL(`${GMAIL_API_BASE}/messages`);
  listUrl.searchParams.set("maxResults", String(maxResults));
  for (const labelId of labelIds) {
    listUrl.searchParams.append("labelIds", labelId);
  }
  if (query) {
    listUrl.searchParams.set("q", query);
  }
  if (pageToken) {
    listUrl.searchParams.set("pageToken", pageToken);
  }

  const listResponse = await fetchGmail(userId, listUrl);

  if (!listResponse.ok) {
    throw new Error(
      `Gmail API error while listing messages: ${listResponse.status}`
    );
  }

  const { messages = [], nextPageToken } =
    (await listResponse.json()) as GmailListResponse;

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

  return { messages: fullMessages.map(toInboxMessage), nextPageToken };
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

export interface EmailThread {
  id: string;
  messages: InboxMessage[];
}

// Fetches the full Gmail conversation a message belongs to via Gmail's
// native threads.get endpoint - Gmail is the source of truth for thread
// membership and ordering, so this never fetches the mailbox and groups
// messages itself. Reuses the same message shape/parsing as
// listRecentEmails/getEmailById via toInboxMessage. Returns null if the
// thread doesn't exist (or isn't accessible), matching getEmailById's
// not-found convention. Messages are defensively sorted by internalDate
// ascending (oldest first) - Gmail already returns them in this order, but
// sorting guards against relying on unspecified API behavior.
export async function getEmailThread(
  userId: string,
  threadId: string
): Promise<EmailThread | null> {
  const threadUrl = new URL(`${GMAIL_API_BASE}/threads/${threadId}`);
  threadUrl.searchParams.set("format", "full");

  const threadResponse = await fetchGmail(userId, threadUrl);

  if (threadResponse.status === 404) {
    return null;
  }

  if (!threadResponse.ok) {
    throw new Error(
      `Gmail API error while fetching thread ${threadId}: ${threadResponse.status}`
    );
  }

  const thread = (await threadResponse.json()) as {
    id: string;
    messages?: GmailMessageResponse[];
  };

  const orderedMessages = (thread.messages ?? [])
    .slice()
    .sort((a, b) => Number(a.internalDate ?? 0) - Number(b.internalDate ?? 0));

  return {
    id: thread.id,
    messages: orderedMessages.map(toInboxMessage),
  };
}

export interface AttachmentContent {
  filename: string;
  mimeType: string;
  data: Buffer;
}

// Downloads one attachment's bytes for a given message, identified by
// partId rather than Gmail's attachmentId (see AttachmentMeta's comment -
// attachmentId is minted fresh per messages.get call, so a value captured
// at page-render time is already stale by the time a download is clicked).
// Refetches the message first to confirm the requested partId genuinely
// belongs to this message, to source a currently-valid attachmentId for it,
// and to get the filename/mimeType Gmail's attachments.get response itself
// doesn't include. Returns null if the message, or a matching attachment on
// it, doesn't exist/isn't accessible to this user.
export async function getAttachment(
  userId: string,
  messageId: string,
  partId: string
): Promise<AttachmentContent | null> {
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
  const meta = findAttachmentParts(message.payload).find(
    (attachment) => attachment.partId === partId
  );

  if (!meta) {
    return null;
  }

  const attachmentUrl = new URL(
    `${GMAIL_API_BASE}/messages/${messageId}/attachments/${meta.attachmentId}`
  );

  const attachmentResponse = await fetchGmail(userId, attachmentUrl);

  if (attachmentResponse.status === 404) {
    return null;
  }

  if (!attachmentResponse.ok) {
    throw new Error(
      `Gmail API error while fetching attachment part ${partId} on message ${messageId}: ${attachmentResponse.status}`
    );
  }

  const body = (await attachmentResponse.json()) as { data?: string };

  if (!body.data) {
    return null;
  }

  const base64 = body.data.replace(/-/g, "+").replace(/_/g, "/");

  return {
    filename: meta.filename,
    mimeType: meta.mimeType,
    data: Buffer.from(base64, "base64"),
  };
}

// Strips CR/LF from a header value before it's embedded in a hand-built
// RFC 2822 message - without this, a value containing a newline could
// inject additional headers into the raw message.
function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

// Joins RFC 2822 header lines and a body into a raw message and
// base64url-encodes it the way Gmail's messages.send expects. Shared by
// sendReply and sendForward so the MIME-construction/encoding logic only
// lives in one place.
function encodeMimeMessage(headerLines: string[], body: string): string {
  const rawMessage = `${headerLines.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(rawMessage, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Structural check only (not a full RFC 5322 validator) - enough to reject
// obviously malformed input. Exported so callers (e.g. the forward Server
// Action) can give a specific "this address looks wrong" error before ever
// reaching sendForward, without duplicating the pattern.
export const BASIC_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sends a plain-text reply to an existing Gmail message via messages.send,
// threading it into the same Gmail conversation via threadId plus the
// standard In-Reply-To/References headers. Uses the gmail.modify scope
// already requested in src/lib/auth.ts - confirmed empirically (a real
// reply sent successfully against the live account) that gmail.modify
// alone covers messages.send; no separate gmail.send scope is needed.
//
// Re-fetches the original message fresh (metadata only, not the full
// body) rather than trusting any caller-supplied header/subject/thread
// values, so the recipient/subject/threading are always derived from
// Gmail's own current state, not something the browser could influence.
export async function sendReply(
  userId: string,
  messageId: string,
  body: string
): Promise<void> {
  const messageUrl = new URL(`${GMAIL_API_BASE}/messages/${messageId}`);
  messageUrl.searchParams.set("format", "metadata");
  for (const header of [
    "Subject",
    "From",
    "Reply-To",
    "Message-ID",
    "References",
  ]) {
    messageUrl.searchParams.append("metadataHeaders", header);
  }

  const messageResponse = await fetchGmail(userId, messageUrl);

  if (messageResponse.status === 404) {
    throw new Error(`Message ${messageId} not found`);
  }

  if (!messageResponse.ok) {
    throw new Error(
      `Gmail API error while fetching message ${messageId} for reply: ${messageResponse.status}`
    );
  }

  const original = (await messageResponse.json()) as GmailMessageResponse;
  const threadId = original.threadId ?? messageId;
  const headers = original.payload?.headers;

  const originalSubject = getHeader(headers, "Subject");
  const subject =
    originalSubject === "(unknown)"
      ? "Re:"
      : /^re:/i.test(originalSubject.trim())
        ? originalSubject
        : `Re: ${originalSubject}`;

  // Reply-To takes precedence over From when present, per normal reply
  // conventions - the sender may want replies routed elsewhere.
  const replyTo = getHeader(headers, "Reply-To");
  const from = getHeader(headers, "From");
  const recipient = replyTo !== "(unknown)" ? replyTo : from;

  if (recipient === "(unknown)") {
    throw new Error(
      `Could not determine a reply recipient for message ${messageId}`
    );
  }

  const originalMessageIdHeader = getHeader(headers, "Message-ID");
  const originalReferences = getHeader(headers, "References");
  const references =
    originalMessageIdHeader === "(unknown)"
      ? undefined
      : originalReferences === "(unknown)"
        ? originalMessageIdHeader
        : `${originalReferences} ${originalMessageIdHeader}`;

  const headerLines = [
    `To: ${sanitizeHeaderValue(recipient)}`,
    `Subject: ${sanitizeHeaderValue(subject)}`,
    ...(originalMessageIdHeader !== "(unknown)"
      ? [`In-Reply-To: ${sanitizeHeaderValue(originalMessageIdHeader)}`]
      : []),
    ...(references ? [`References: ${sanitizeHeaderValue(references)}`] : []),
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
  ];

  // From is deliberately omitted - Gmail fills it in with the
  // authenticated account's own address when not set.
  const encodedMessage = encodeMimeMessage(headerLines, body);

  const sendUrl = new URL(`${GMAIL_API_BASE}/messages/send`);
  const sendResponse = await fetchGmail(userId, sendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encodedMessage, threadId }),
  });

  if (!sendResponse.ok) {
    throw new Error(
      `Gmail API error while sending reply to message ${messageId}: ${sendResponse.status}`
    );
  }
}

// Forwards an existing message as a brand-new outgoing message - deliberately
// NOT threaded (no threadId in the send request, no In-Reply-To/References
// headers), so Gmail creates a fresh conversation rather than appending to
// the original thread. Reuses getEmailById's existing header/body parsing
// (the same subject/from/to/date/body already shown in the UI) instead of
// a second raw fetch, since a forward only needs to *display* the original
// content, not thread against it.
export async function sendForward(
  userId: string,
  messageId: string,
  recipients: string[],
  message: string
): Promise<void> {
  if (recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  const invalid = recipients.find((r) => !BASIC_EMAIL_PATTERN.test(r));
  if (invalid) {
    throw new Error(`Invalid recipient address`);
  }

  const original = await getEmailById(userId, messageId);

  if (!original) {
    throw new Error(`Message ${messageId} not found`);
  }

  const subject = /^fwd:/i.test(original.subject.trim())
    ? original.subject
    : `Fwd: ${original.subject}`;

  const forwardedBlock =
    `---------- Forwarded message ---------\n` +
    `From: ${original.from}\n` +
    `Date: ${original.date}\n` +
    `Subject: ${original.subject}\n` +
    `To: ${original.to}\n\n` +
    `${original.body || "(no body extracted)"}`;

  const body = message.trim()
    ? `${message.trim()}\n\n${forwardedBlock}`
    : forwardedBlock;

  const headerLines = [
    `To: ${sanitizeHeaderValue(recipients.join(", "))}`,
    `Subject: ${sanitizeHeaderValue(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
  ];

  const encodedMessage = encodeMimeMessage(headerLines, body);

  const sendUrl = new URL(`${GMAIL_API_BASE}/messages/send`);
  const sendResponse = await fetchGmail(userId, sendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No threadId here - forwarding must create a new, separate
    // conversation rather than appending to the original thread.
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!sendResponse.ok) {
    throw new Error(
      `Gmail API error while forwarding message ${messageId}: ${sendResponse.status}`
    );
  }
}

// Sends a brand-new outgoing message with no relation to any existing
// Gmail thread - same "new conversation" shape as sendForward (no
// threadId, no In-Reply-To/References), just without an original message
// to fetch or include. subject/body may be empty - Gmail itself allows
// sending a blank subject/body, so this doesn't add an artificial
// requirement beyond having at least one valid recipient.
export async function sendCompose(
  userId: string,
  recipients: string[],
  subject: string,
  body: string
): Promise<void> {
  if (recipients.length === 0) {
    throw new Error("At least one recipient is required");
  }

  const invalid = recipients.find((r) => !BASIC_EMAIL_PATTERN.test(r));
  if (invalid) {
    throw new Error(`Invalid recipient address`);
  }

  const headerLines = [
    `To: ${sanitizeHeaderValue(recipients.join(", "))}`,
    `Subject: ${sanitizeHeaderValue(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 8bit`,
  ];

  const encodedMessage = encodeMimeMessage(headerLines, body);

  const sendUrl = new URL(`${GMAIL_API_BASE}/messages/send`);
  const sendResponse = await fetchGmail(userId, sendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No threadId - a freshly composed message always starts a new
    // conversation, never appended to an existing one.
    body: JSON.stringify({ raw: encodedMessage }),
  });

  if (!sendResponse.ok) {
    throw new Error(
      `Gmail API error while sending composed message: ${sendResponse.status}`
    );
  }
}

// Adds/removes Gmail labels on a message via the messages.modify endpoint -
// the shared primitive behind read/unread, starring, and any future
// label-based mutation (archive, trash, spam, ...). Requires gmail.modify.
async function modifyGmailLabels(
  userId: string,
  messageId: string,
  { addLabelIds, removeLabelIds }: { addLabelIds?: string[]; removeLabelIds?: string[] }
): Promise<void> {
  const modifyUrl = new URL(`${GMAIL_API_BASE}/messages/${messageId}/modify`);

  const response = await fetchGmail(userId, modifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(addLabelIds ? { addLabelIds } : {}),
      ...(removeLabelIds ? { removeLabelIds } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Gmail API error while modifying labels for message ${messageId}: ${response.status}`
    );
  }
}

// Marks a message as read or unread on the actual Gmail account by
// adding/removing the UNREAD label.
export async function setEmailReadStatus(
  userId: string,
  messageId: string,
  markAsRead: boolean
): Promise<void> {
  return modifyGmailLabels(
    userId,
    messageId,
    markAsRead ? { removeLabelIds: ["UNREAD"] } : { addLabelIds: ["UNREAD"] }
  );
}

// Stars or unstars a message on the actual Gmail account by adding/removing
// the STARRED label.
export async function setEmailStarred(
  userId: string,
  messageId: string,
  starred: boolean
): Promise<void> {
  return modifyGmailLabels(
    userId,
    messageId,
    starred ? { addLabelIds: ["STARRED"] } : { removeLabelIds: ["STARRED"] }
  );
}

// Archives a message on the actual Gmail account by removing the INBOX
// label. The message itself is not deleted or moved to Trash/Spam - it
// remains in the account, just no longer in the inbox view.
export async function archiveEmail(
  userId: string,
  messageId: string
): Promise<void> {
  return modifyGmailLabels(userId, messageId, { removeLabelIds: ["INBOX"] });
}

// Moves a message to Gmail's Trash by adding the TRASH label and removing
// INBOX - the same label diff Gmail's own dedicated messages.trash endpoint
// applies (verified directly against the Gmail API), so this matches normal
// trash semantics without a separate call shape. This is not permanent
// deletion - the message remains in Trash until Gmail auto-expires it.
export async function trashEmail(
  userId: string,
  messageId: string
): Promise<void> {
  return modifyGmailLabels(userId, messageId, {
    addLabelIds: ["TRASH"],
    removeLabelIds: ["INBOX"],
  });
}

// Marks a message as spam by adding the SPAM label and removing INBOX. Not
// permanent deletion - the message remains in the Spam folder in Gmail.
export async function markEmailAsSpam(
  userId: string,
  messageId: string
): Promise<void> {
  return modifyGmailLabels(userId, messageId, {
    addLabelIds: ["SPAM"],
    removeLabelIds: ["INBOX"],
  });
}
