import "server-only";

import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Refresh a bit before actual expiry to avoid racing a request against it.
const EXPIRY_BUFFER_SECONDS = 60;

export class GoogleReauthRequiredError extends Error {
  constructor() {
    super("Google account needs to be reconnected.");
    this.name = "GoogleReauthRequiredError";
  }
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

// Returns a valid Google access token for the given user, refreshing it via
// the stored refresh_token if the current one has expired. Tokens live on
// the Account row Auth.js already creates on sign-in - this doesn't
// introduce a new storage mechanism, only a way to keep it current.
//
// expires_at is only a local prediction of the token's maximum lifetime -
// Google can invalidate a token earlier than that (revocation, rotation,
// a newer token superseding it, etc.). Pass forceRefresh: true when a
// caller has already learned from Google itself (e.g. a live 401) that
// the cached token is dead, to skip trusting the stale timestamp.
export async function getValidGoogleAccessToken(
  userId: string,
  { forceRefresh = false }: { forceRefresh?: boolean } = {}
): Promise<string> {
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  });

  if (!account) {
    throw new GoogleReauthRequiredError();
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const isExpired =
    !account.expires_at ||
    account.expires_at - EXPIRY_BUFFER_SECONDS <= nowInSeconds;
  console.log({
  expires_at: account.expires_at,
  nowInSeconds,
  isExpired,
  hasAccessToken: !!account.access_token,
});

  if (!forceRefresh && !isExpired && account.access_token) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new GoogleReauthRequiredError();
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: account.refresh_token,
      grant_type: "refresh_token",
    }),
  });

if (!response.ok) {
  console.log(await response.text());
  throw new GoogleReauthRequiredError();
}

  const tokens = (await response.json()) as GoogleTokenResponse;
  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;

  await prisma.account.update({
    where: { id: account.id },
    data: {
      access_token: tokens.access_token,
      expires_at: expiresAt,
      ...(tokens.scope ? { scope: tokens.scope } : {}),
    },
  });

  return tokens.access_token;
}
