import Link from "next/link";

// Plain native GET form - submitting navigates to `${folderPath}?q=...`,
// so search state lives entirely in the URL. No client component, no
// client-side state, matching the existing server-first architecture.
export function SearchBar({
  folderPath,
  query,
}: {
  folderPath: string;
  query?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <form action={folderPath} className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search mail"
          className="w-full min-w-0 rounded-full border border-black/[.08] bg-white px-4 py-1.5 text-sm text-black placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-white/[.08] dark:bg-zinc-950 dark:text-zinc-50 sm:w-64"
        />
        <button
          type="submit"
          className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Search
        </button>
      </form>
      {query && (
        <Link
          href={folderPath}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          Clear
        </Link>
      )}
    </div>
  );
}
