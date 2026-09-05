import { SimpleFolderPage } from "@/app/inbox/SimpleFolderPage";

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" && q.trim() ? q.trim() : undefined;

  return (
    <SimpleFolderPage
      label="TRASH"
      title="Trash"
      activeHref="/trash"
      reconnectMessage="Your Google account needs to be reconnected to load Trash."
      loadErrorMessage="We couldn't load Trash right now. Please try again shortly."
      query={query}
    />
  );
}
