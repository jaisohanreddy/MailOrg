import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          // Required for Google to issue a refresh_token (needed to call the
          // Gmail API after the initial access token expires), not just on
          // the user's very first consent.
          access_type: "offline",
          prompt: "consent",
          // gmail.modify already covers messages.send - confirmed
          // empirically against the real account (a real reply sent
          // successfully with a token whose stored scope was only
          // gmail.readonly + gmail.modify, no gmail.send). No scope change
          // was needed for the Reply feature.
          scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify",
        },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
        },
      };
    },
  },
  events: {
    // When a Google account that's already linked signs in again (e.g. via
    // the "Reconnect Google" flow), Auth.js's own login handling just
    // resumes the existing session - it does NOT write the freshly issued
    // tokens back onto the existing Account row. Without this, a dead
    // refresh_token would stay dead even after the user re-authorizes,
    // since the new one Google just issued would be silently discarded.
    // This is the only place those fresh tokens are available server-side,
    // so persist them here onto the existing Account (never creating a new
    // one - provider+providerAccountId already uniquely identifies it).
    async signIn({ account }) {
      if (!account || account.provider !== "google") return;

      try {
        await prisma.account.updateMany({
          where: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
          data: {
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            // Google only returns a refresh_token when it decides to issue
            // one (first consent, or a forced re-consent) - never clear a
            // still-stored one just because this particular grant omitted it.
            ...(account.refresh_token
              ? { refresh_token: account.refresh_token }
              : {}),
          },
        });
      } catch (err) {
        console.error(
          "Failed to persist refreshed Google tokens:",
          err instanceof Error ? err.message : String(err)
        );
      }
    },
  },
});
