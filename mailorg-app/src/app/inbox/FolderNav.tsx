import Link from "next/link";

const FOLDERS = [
  { href: "/inbox", label: "Inbox" },
  { href: "/sent", label: "Sent" },
  { href: "/drafts", label: "Drafts" },
  { href: "/spam", label: "Spam" },
  { href: "/trash", label: "Trash" },
] as const;

// Plain Gmail-label-based folder navigation - no database state, Gmail is
// the source of truth for what's in each folder. Rendered inline by each
// folder page (not a Next.js layout.tsx) so it doesn't apply to the
// message detail route, which isn't a folder listing.
export function FolderNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-row flex-wrap gap-2 sm:w-40 sm:flex-none sm:flex-col">
      {FOLDERS.map((folder) => (
        <Link
          key={folder.href}
          href={folder.href}
          aria-current={active === folder.href ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:rounded-lg ${
            active === folder.href
              ? "bg-blue-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {folder.label}
        </Link>
      ))}
    </nav>
  );
}
