import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse";

const MCP_URL = "https://mcp.granola.ai/mcp";

// --- Types ---

export type GranolaNoteListItem = {
  id: string;
  title: string;
  created_at: string;
};

export type GranolaNoteDetail = {
  id: string;
  title: string;
  summary_text: string | null;
  created_at: string;
  calendar_event: {
    title: string;
    start_time: string;
    end_time: string;
  } | null;
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
  return meetings;
}

export async function fetchNoteDetail(
  client: Client,
  noteId: string
): Promise<GranolaNoteDetail> {
  const result = await client.callTool({
    name: "get_meetings",
    arguments: { meeting_ids: [noteId] },
  });

  const text = extractText(result);

  // Extract title from XML if present
  const titleMatch = text.match(/<meeting[^>]+title="([^"]+)"/);
  const dateMatch = text.match(/<meeting[^>]+date="([^"]+)"/);

  // Extract summary/notes content — look for common XML tags or use full text
  const summaryMatch =
    text.match(/<notes>([\s\S]*?)<\/notes>/) ??
    text.match(/<summary>([\s\S]*?)<\/summary>/) ??
    text.match(/<content>([\s\S]*?)<\/content>/);

  // Use the full text as summary if no structured content found
  const summaryText = summaryMatch?.[1]?.trim() ?? text;

  return {
    id: noteId,
    title: titleMatch?.[1] ?? "",
    summary_text: summaryText,
    created_at: dateMatch?.[1] ?? "",
    calendar_event: null,
  };
}

// --- Matching ---

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

export function titlesMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}
