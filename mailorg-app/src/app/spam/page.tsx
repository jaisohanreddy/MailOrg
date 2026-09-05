import { SimpleFolderPage } from "@/app/inbox/SimpleFolderPage";

export default async function SpamPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" && q.trim() ? q.trim() : undefined;

  return (
    <SimpleFolderPage
      label="SPAM"
      title="Spam"
      activeHref="/spam"
      reconnectMessage="Your Google account needs to be reconnected to load spam."
      loadErrorMessage="We couldn't load spam right now. Please try again shortly."
      query={query}
    />
  );
}
