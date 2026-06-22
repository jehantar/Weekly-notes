export function extractGoogleDocFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;

    if (url.hostname === "docs.google.com") {
      return url.pathname.match(/^\/document\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
    }

    if (url.hostname === "drive.google.com") {
      const pathFileId = url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)/)?.[1];
      return pathFileId ?? url.searchParams.get("id");
    }
  } catch {
    return null;
  }

  return null;
}

export function buildGoogleDocAttachment(input: string): {
  sourceUrl: string;
  sourceFileId: string;
} | null {
  const sourceUrl = input.trim();
  const sourceFileId = extractGoogleDocFileId(sourceUrl);

  if (!sourceFileId) return null;

  return { sourceUrl, sourceFileId };
}
