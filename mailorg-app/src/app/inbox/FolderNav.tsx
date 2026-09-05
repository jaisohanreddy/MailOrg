import Link from "next/link";

const FOLDERS = [
  { href: "/inbox", label: "Inbox" },
  { href: "/sent", label: "Sent" },
  { href: "/drafts", label: "Drafts" },
  { href: "/spam", label: "Spam" },
  { href: "/trash", label: "Trash" },
] as const;

function NavLink({ href, label, active }: { href: string; label: string; active: string }) {
  return (
    <Link
      href={href}
      aria-current={active === href ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:rounded-lg ${
        active === href
          ? "bg-blue-600 text-white"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {label}
    </Link>
  );
}

// Plain Gmail-label-based folder navigation - no database state, Gmail is
// the source of truth for what's in each folder. Rendered inline by each
// folder page (not a Next.js layout.tsx) so it doesn't apply to the
// message detail route, which isn't a folder listing. Also the app's one
// persistent nav element, so it carries a link to the (non-Gmail) Context
// settings page too, visually separated from the folder list.
export function FolderNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-row flex-wrap gap-2 sm:w-40 sm:flex-none sm:flex-col">
      {FOLDERS.map((folder) => (
        <NavLink key={folder.href} href={folder.href} label={folder.label} active={active} />
      ))}
      <div className="my-1 h-px w-full bg-black/[.08] dark:bg-white/[.08]" />
      <NavLink href="/settings/context" label="Context" active={active} />
    </nav>
  );
}
