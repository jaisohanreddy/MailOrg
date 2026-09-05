import { SimpleFolderPage } from "@/app/inbox/SimpleFolderPage";

export default async function DraftsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" && q.trim() ? q.trim() : undefined;

  return (
    <SimpleFolderPage
      label="DRAFT"
      title="Drafts"
      activeHref="/drafts"
      reconnectMessage="Your Google account needs to be reconnected to load your drafts."
      loadErrorMessage="We couldn't load your drafts right now. Please try again shortly."
      query={query}
    />
  );
}
