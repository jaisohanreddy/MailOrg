export default function InboxLoading() {
  return (
    <div className="flex flex-1 flex-col gap-10 px-6 py-10 sm:px-12">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        Inbox
      </h1>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-20 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-l-4 border-black/[.08] border-l-zinc-200 bg-white p-4 dark:border-white/[.08] dark:border-l-zinc-800 dark:bg-zinc-950"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-3 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
