/** Strip HTML tags, returning plain text. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Hash a question string for matching across regenerations.
 *  Normalizes: lowercase, trim, strip trailing punctuation.
 *  Returns first 16 hex chars of SHA-256. */
export async function hashQuestion(text: string): Promise<string> {
  const normalized = text.toLowerCase().trim().replace(/[?.!]+$/, "");
  const encoded = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
