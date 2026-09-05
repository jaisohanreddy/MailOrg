import { SimpleFolderPage } from "@/app/inbox/SimpleFolderPage";

export default async function SentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q } = await searchParams;
  const query = typeof q === "string" && q.trim() ? q.trim() : undefined;

  return (
    <SimpleFolderPage
      label="SENT"
      title="Sent"
      activeHref="/sent"
      reconnectMessage="Your Google account needs to be reconnected to load your sent mail."
      loadErrorMessage="We couldn't load your sent mail right now. Please try again shortly."
      query={query}
    />
  );
}
