export default function EmailDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10 sm:px-12">
      <div className="h-4 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />

      <div className="flex flex-col gap-3 rounded-xl border border-l-4 border-black/[.08] border-l-zinc-200 bg-white p-6 dark:border-white/[.08] dark:border-l-zinc-800 dark:bg-zinc-950">
        <div className="h-6 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
        <div className="h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.08] dark:bg-zinc-950">
        <div className="h-3 w-20 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
      </div>
    </div>
  );
}
