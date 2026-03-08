/** Strip HTML tags, returning plain text. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
