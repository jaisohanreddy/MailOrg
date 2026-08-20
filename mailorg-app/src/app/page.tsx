import Link from "next/link";
import { Inbox, Shield, Sparkles } from "lucide-react";

import { auth, signIn, signOut } from "@/lib/auth";

export default async function Home() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">MailOrg</span>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/inbox"
                className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                Inbox
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button
                type="submit"
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Continue with Google
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
            Never miss what matters.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600">
            MailOrg helps students and professionals focus on important emails
            using intelligent organization and AI-powered insights.
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Link
                href="/inbox"
                className="flex h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Go to Inbox
              </Link>
            ) : (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Continue with Google
                </button>
              </form>
            )}
            <a
              href="#features"
              className="flex h-12 items-center justify-center rounded-full border border-zinc-200 px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Learn More
            </a>
          </div>

          <p className="mt-4 text-sm text-zinc-400">
            Currently in development • First public milestone
          </p>
        </section>

        <section
          id="features"
          className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-24"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Inbox className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                Smart Inbox
              </h3>
              <p className="text-sm leading-6 text-zinc-600">
                View your Gmail inbox in a clean, distraction-free workspace.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                Secure Gmail Integration
              </h3>
              <p className="text-sm leading-6 text-zinc-600">
                Authenticate securely with Google and sync your inbox.
              </p>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                  Coming Soon
                </span>
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                AI Assistant
              </h3>
              <p className="text-sm leading-6 text-zinc-600">
                Email summaries, priority detection, task extraction, and
                personalized insights.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100 py-8">
        <p className="text-center text-sm text-zinc-400">
          Built with Next.js • Auth.js • Prisma • PostgreSQL • Gmail API
        </p>
      </footer>
    </div>
  );
}
