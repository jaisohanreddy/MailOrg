import { auth } from "@/lib/auth";
import { GoogleReauthRequiredError } from "@/lib/google-tokens";
import { getAttachment } from "@/lib/gmail";

// Builds a Content-Disposition header safely: an ASCII-only quoted-string
// fallback (for older clients) plus an RFC 5987 filename* for full Unicode
// support. Both branches strip CR/LF and quotes so a crafted filename can't
// inject extra headers.
function buildContentDisposition(filename: string): string {
  const sanitized = filename.replace(/[\r\n"\\]/g, "_");
  const asciiFallback = sanitized.replace(/[^\x20-\x7E]/g, "_") || "attachment";
  const encoded = encodeURIComponent(sanitized);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string; partId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messageId, partId } = await params;

  try {
    const attachment = await getAttachment(session.user.id, messageId, partId);

    if (!attachment) {
      return new Response("Attachment not found", { status: 404 });
    }

    return new Response(new Uint8Array(attachment.data), {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": buildContentDisposition(attachment.filename),
        "Content-Length": String(attachment.data.length),
      },
    });
  } catch (err) {
    console.error(
      "Failed to download Gmail attachment:",
      err instanceof Error ? err.message : String(err)
    );

    if (err instanceof GoogleReauthRequiredError) {
      return new Response("Your Google account needs to be reconnected.", {
        status: 401,
      });
    }

    return new Response("Couldn't download this attachment. Please try again.", {
      status: 502,
    });
  }
}
