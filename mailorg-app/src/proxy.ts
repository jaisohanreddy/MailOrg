import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic route protection only: this checks for the presence of the
// Auth.js session cookie, not whether it's actually valid. It exists to
// pre-filter unauthenticated requests before they render. The authoritative
// check (real session lookup via the Prisma adapter) happens in each
// protected page/Server Action by calling `auth()` from "@/lib/auth" -
// see https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/inbox",
  "/important",
  "/sent",
  "/drafts",
  "/spam",
  "/trash",
];

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const hasSessionCookie = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name)
  );

  if (!hasSessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
