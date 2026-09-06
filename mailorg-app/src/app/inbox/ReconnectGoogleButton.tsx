import { signIn } from "@/lib/auth";

// Drives the user through Google's OAuth flow again for the same account.
// The provider is already configured with access_type: offline and
// prompt: consent (see src/lib/auth.ts), so this always forces Google to
// show the consent screen and issue a fresh access/refresh token pair -
// exactly what's needed to replace a dead refresh_token. Existing
// User/Account rows are reused, never duplicated (see the signIn event in
// src/lib/auth.ts that persists the fresh tokens onto the existing Account).
export function ReconnectGoogleButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/inbox" });
      }}
    >
      <button
        type="submit"
        className="mt-1 flex h-9 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        Reconnect Google
      </button>
    </form>
  );
}
