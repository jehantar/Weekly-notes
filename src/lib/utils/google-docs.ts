const GOOGLE_DOC_ID_PATTERNS = [
  /docs\.google\.com\/document\/d\/([A-Za-z0-9_-]+)/,
  /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/,
  /[?&]id=([A-Za-z0-9_-]+)/,
];

export function extractGoogleDocFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  for (const pattern of GOOGLE_DOC_ID_PATTERNS) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function normalizeMeetingNoteSnapshot(content: string): string {
  return content
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
