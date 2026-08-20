import "server-only";

import OpenAI from "openai";

import { prisma } from "@/lib/prisma";

const MODEL = "gpt-5.4-mini";

// Bump this to intentionally invalidate all previously stored analyses -
// rows with an older version are treated as stale and re-analyzed.
const ANALYSIS_VERSION = 2;

const PRIORITIES = ["high", "medium", "low"] as const;
const CATEGORIES = [
  "academic",
  "work",
  "personal",
  "promotional",
  "other",
] as const;

export interface EmailAnalysis {
  priority: (typeof PRIORITIES)[number];
  category: (typeof CATEGORIES)[number];
  summary: string;
  actionRequired: boolean;
  action: string | null;
  deadline: string | null;
}

// Returned whenever the model call, parsing, or validation fails, so a
// single bad response never breaks inbox rendering.
const FALLBACK_ANALYSIS: EmailAnalysis = {
  priority: "low",
  category: "other",
  summary: "",
  actionRequired: false,
  action: null,
  deadline: null,
};

const EMAIL_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    priority: { type: "string", enum: PRIORITIES },
    category: { type: "string", enum: CATEGORIES },
    summary: { type: "string" },
    actionRequired: { type: "boolean" },
    action: { type: ["string", "null"] },
    deadline: { type: ["string", "null"] },
  },
  required: [
    "priority",
    "category",
    "summary",
    "actionRequired",
    "action",
    "deadline",
  ],
  additionalProperties: false,
};

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function isValidAnalysis(value: unknown): value is EmailAnalysis {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;

  return (
    typeof v.priority === "string" &&
    (PRIORITIES as readonly string[]).includes(v.priority) &&
    typeof v.category === "string" &&
    (CATEGORIES as readonly string[]).includes(v.category) &&
    typeof v.summary === "string" &&
    typeof v.actionRequired === "boolean" &&
    (v.action === null || typeof v.action === "string") &&
    (v.deadline === null || typeof v.deadline === "string")
  );
}

interface AnalyzableEmail {
  id?: string;
  subject: string;
  from: string;
  body: string;
}

// Narrows a stored row's untyped priority/category strings back into
// EmailAnalysis, reusing the same validation as fresh model output so a
// corrupted row can never be trusted blindly.
function toEmailAnalysis(row: {
  priority: string;
  category: string;
  summary: string;
  actionRequired: boolean;
  action: string | null;
  deadline: string | null;
}): EmailAnalysis | null {
  return isValidAnalysis(row) ? row : null;
}

// True for Prisma's unique-constraint-violation error (P2002). Two
// concurrent requests analyzing the same (userId, messageId) can both
// reach the write below; the @@unique constraint guarantees only one row
// ever exists, so this is an expected race outcome, not a real failure.
function isUniqueConstraintError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

// Analyzes a single email with the OpenAI Responses API. Never throws -
// any request, parsing, or validation failure resolves to a neutral
// fallback so one bad email can't take down the rest of the inbox.
//
// Successful analyses are stored permanently (no TTL) keyed by
// (userId, Gmail message id), so a given email is only ever sent to
// OpenAI once - later loads read the stored row instead.
export async function analyzeEmail(
  email: AnalyzableEmail,
  userId: string
): Promise<EmailAnalysis> {
  if (email.id) {
    try {
      const stored = await prisma.emailAnalysisRecord.findUnique({
        where: { userId_messageId: { userId, messageId: email.id } },
      });

      if (stored && stored.analysisVersion === ANALYSIS_VERSION) {
        const analysis = toEmailAnalysis(stored);
        if (analysis) {
          return analysis;
        }
      }
    } catch (err) {
      console.error(
        "Failed to read stored email analysis:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions:
        "You triage inbox emails for a busy student or professional. " +
        "Read the email and classify it, choosing priority using these rules: " +
        "high = urgent deadlines, financial or security issues, important " +
        "personal or work requests, immigration/legal/academic consequences, " +
        "or anything requiring prompt action; " +
        "medium = a useful or important email that deserves attention but " +
        "isn't urgent; " +
        "low = newsletters, promotions, social notifications, marketing, " +
        "entertainment, or routine informational mail. " +
        "Judge each email strictly on its own content and consequences - do " +
        "not aim for any particular mix of priorities across emails. " +
        "Only set actionRequired to true when the recipient personally needs " +
        "to do something in response. Keep the summary to one short sentence.",
      input: `From: ${email.from}\nSubject: ${email.subject}\n\nBody:\n${email.body.slice(0, 6000)}`,
      text: {
        format: {
          type: "json_schema",
          name: "email_analysis",
          schema: EMAIL_ANALYSIS_SCHEMA,
          strict: true,
        },
      },
    });

    const parsed: unknown = JSON.parse(response.output_text);
    if (!isValidAnalysis(parsed)) {
      return FALLBACK_ANALYSIS;
    }

    if (email.id) {
      try {
        await prisma.emailAnalysisRecord.upsert({
          where: { userId_messageId: { userId, messageId: email.id } },
          create: {
            userId,
            messageId: email.id,
            analysisVersion: ANALYSIS_VERSION,
            priority: parsed.priority,
            category: parsed.category,
            summary: parsed.summary,
            actionRequired: parsed.actionRequired,
            action: parsed.action,
            deadline: parsed.deadline,
          },
          update: {
            analysisVersion: ANALYSIS_VERSION,
            priority: parsed.priority,
            category: parsed.category,
            summary: parsed.summary,
            actionRequired: parsed.actionRequired,
            action: parsed.action,
            deadline: parsed.deadline,
          },
        });
      } catch (err) {
        if (!isUniqueConstraintError(err)) {
          console.error(
            "Failed to persist email analysis:",
            err instanceof Error ? err.message : String(err)
          );
        }
        // A unique-constraint hit here means a concurrent request already
        // wrote this row first - that's the constraint working as
        // intended, not an error. Either way we still return our own
        // freshly computed `parsed` result below.
      }
    }

    return parsed;
  } catch (err) {
    // Structured, content-free diagnostics: never log the API key or email
    // body/subject, only the error's own type/status/message.
    const status =
      err && typeof err === "object" && "status" in err
        ? (err as { status?: unknown }).status
        : undefined;
    const code =
      err && typeof err === "object" && "code" in err
        ? (err as { code?: unknown }).code
        : undefined;
    const message = err instanceof Error ? err.message : String(err);
    console.error("Email analysis failed:", { status, code, message });
    return FALLBACK_ANALYSIS;
  }
}

// Analyzes multiple emails in parallel, keyed by message id. Individual
// failures (already caught inside analyzeEmail) fall back to a neutral
// result rather than rejecting the whole batch.
export async function analyzeEmails(
  emails: (AnalyzableEmail & { id: string })[],
  userId: string
): Promise<Map<string, EmailAnalysis>> {
  const entries = await Promise.all(
    emails.map(async (email) => {
      const analysis = await analyzeEmail(email, userId).catch(
        () => FALLBACK_ANALYSIS
      );
      return [email.id, analysis] as const;
    })
  );

  return new Map(entries);
}
