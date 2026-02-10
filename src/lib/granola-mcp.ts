import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";
import { summarizeMeeting } from "./summarize";

const MCP_URL = "https://mcp.granola.ai/mcp";

// --- Types ---

export type GranolaNoteListItem = {
  id: string;
  title: string;
  created_at: string;
};


// --- MCP Client ---

export async function createGranolaClient(
  bearerToken: string
): Promise<Client> {
  const client = new Client({ name: "weekly-notes", version: "0.1.0" });

  const headers = { Authorization: `Bearer ${bearerToken}` };

  try {
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      requestInit: { headers },
    });
    await client.connect(transport);
  } catch {
    // Fall back to SSE transport
    const transport = new SSEClientTransport(new URL(MCP_URL), {
      requestInit: { headers },
      eventSourceInit: { fetch: (url, init) => fetch(url, { ...init, headers }) },
    });
    await client.connect(transport);
  }

  return client;
}

// --- Tool helpers ---

function extractText(result: Awaited<ReturnType<Client["callTool"]>>): string {
  if (result.isError) {
    const content = result.content as Array<{ type: string; text?: string }>;
    const errorText = content.find((c) => c.type === "text")?.text ?? "Unknown MCP error";
    throw new Error(`Granola MCP error: ${errorText}`);
  }
  const content = result.content as Array<{ type: string; text?: string }>;
  const textPart = content.find((c) => c.type === "text");
  return textPart?.text ?? "";
}

export async function fetchNotesForRange(
  client: Client,
  afterDate: string,
  beforeDate: string
): Promise<GranolaNoteListItem[]> {
  const result = await client.callTool({
    name: "list_meetings",
    arguments: {
      time_range: "custom",
      custom_start: afterDate,
      custom_end: beforeDate,
    },
  });

  const text = extractText(result);
  return parseMeetingsList(text);
}

/**
 * Parse the XML-like response from list_meetings.
 * Format: <meeting id="..." title="..." date="...">
 */
function parseMeetingsList(text: string): GranolaNoteListItem[] {
  console.log("[Granola] Raw list_meetings response:", text);
  const meetings: GranolaNoteListItem[] = [];
  const regex = /<meeting\s+id="([^"]+)"\s+title="([^"]+)"\s+date="([^"]+)"/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    meetings.push({
      id: match[1],
      title: match[2],
      created_at: match[3],
    });
  }
  console.log("[Granola] Parsed meeting IDs:", meetings.map(m => ({ id: m.id, title: m.title })));
  return meetings;
}

export async function queryMeetingSummary(
  client: Client,
  noteId: string
): Promise<{ summary: string | null; url: string | null }> {
  const result = await client.callTool({
    name: "get_meetings",
    arguments: {
      meeting_ids: [noteId],
    },
  });

  const rawText = extractText(result).trim();
  console.log("[Granola] Raw get_meetings response (last 500 chars):", rawText.slice(-500));
  if (!rawText) return { summary: null, url: null };

  // Extract the real Granola URL from the note content
  const urlMatch = rawText.match(/https:\/\/notes\.granola\.ai\/[^\s)>]+/);
  console.log("[Granola] Extracted URL:", urlMatch?.[0] ?? "NOT FOUND");
  const url = urlMatch ? urlMatch[0] : null;

  const summary = await summarizeMeeting(rawText);
  return { summary: summary || null, url };
}

// --- Matching ---

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/** Dice coefficient: ratio of shared bigrams between two strings (0-1) */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bigram = s.slice(i, i + 2);
      set.set(bigram, (set.get(bigram) ?? 0) + 1);
    }
    return set;
  };

  const aBigrams = bigrams(a);
  const bBigrams = bigrams(b);
  let intersect = 0;
  for (const [bigram, count] of aBigrams) {
    intersect += Math.min(count, bBigrams.get(bigram) ?? 0);
  }
  return (2 * intersect) / (a.length - 1 + (b.length - 1));
}

const SIMILARITY_THRESHOLD = 0.7;

export function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  return similarity(na, nb) >= SIMILARITY_THRESHOLD;
}
