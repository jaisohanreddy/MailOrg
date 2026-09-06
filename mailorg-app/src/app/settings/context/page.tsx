import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { FolderNav } from "@/app/inbox/FolderNav";
import { getUserContext, type UserContextRecord } from "./actions";
import { ContextForm } from "./ContextForm";

export default async function UserContextPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  let record: UserContextRecord | null = null;
  let error: string | null = null;

  try {
    record = await getUserContext();
  } catch (err) {
    console.error(err);
    error =
      "We couldn't load your context right now. Please try again shortly.";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-10 sm:flex-row sm:px-12">
      <FolderNav active="/settings/context" />

      <div className="flex w-full max-w-2xl flex-1 flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            What matters to you right now?
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Tell MailOrg what you&apos;re working on, what you care about, or
            what should get your attention.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <ContextForm
          initialContext={record?.contextText ?? null}
          initialInterpretation={record?.interpretedContext ?? null}
        />
      </div>
    </div>
  );
}
