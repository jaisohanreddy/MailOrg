import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";

// Placeholder only, to prove the protected-route mechanism works end to end.
// The real dashboard/inbox experience is a separate, later piece of work.
export default async function DashboardPlaceholderPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 px-6 dark:bg-black">
      <p className="text-black dark:text-zinc-50">
        Signed in as {session.user.email}
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/sign-in" });
        }}
      >
        <button
          type="submit"
          className="flex h-10 items-center justify-center rounded-full border border-black/[.08] px-5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
