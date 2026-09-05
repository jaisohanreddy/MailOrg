import { signIn } from "@/lib/auth";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This Google account is already registered but couldn't be automatically reconnected. Please contact support to restore access.",
  AccessDenied:
    "Access was denied during sign-in. Please try again or use a different Google account.",
  Configuration:
    "Sign-in is temporarily unavailable due to a configuration issue. Please try again shortly.",
  OAuthSignin:
    "We couldn't start the sign-in process with Google. Please try again.",
  OAuthCallback:
    "Something went wrong while completing sign-in with Google. Please try again.",
  Callback:
    "Something went wrong while completing sign-in. Please try again.",
  Verification:
    "This sign-in link is invalid or has expired. Please try again.",
};

const DEFAULT_ERROR_MESSAGE =
  "Something went wrong while signing in. Please try again.";

function getSignInErrorMessage(error: string | undefined): string | null {
  if (!error) return null;
  return ERROR_MESSAGES[error] ?? DEFAULT_ERROR_MESSAGE;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error: errorParam } = await searchParams;
  const errorMessage = getSignInErrorMessage(
    typeof errorParam === "string" ? errorParam : undefined
  );

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-xl border border-black/[.08] bg-white p-8 text-center dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Sign in to MailOrg
        </h1>

        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </p>
        )}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/dashboard" });
          }}
          className="w-full"
        >
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
