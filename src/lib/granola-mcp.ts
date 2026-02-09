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
    name: "search_meeting_notes",
    arguments: {
      created_after: afterDate,
      created_before: beforeDate,
    },
  });

  const text = extractText(result);
  const parsed = JSON.parse(text);

  // Handle both array and { notes: [...] } shapes
  const notes = (Array.isArray(parsed) ? parsed : parsed.notes ?? []) as Array<
    Record<string, unknown>
  >;
  return notes.map((n) => ({
    id: n.id as string,
    title: n.title as string,
    created_at: n.created_at as string,
  }));
}

export async function fetchNoteDetail(
  client: Client,
  noteId: string
): Promise<GranolaNoteDetail> {
  const result = await client.callTool({
    name: "fetch_meeting_note",
    arguments: { note_id: noteId },
  });

  const text = extractText(result);

  try {
    const parsed = JSON.parse(text);
    return {
      id: parsed.id ?? noteId,
      title: parsed.title ?? "",
      summary_text: parsed.summary_text ?? parsed.summary ?? text,
      created_at: parsed.created_at ?? "",
      calendar_event: parsed.calendar_event ?? null,
    };
  } catch {
    // If the response is plain markdown rather than JSON, use it as summary
    return {
      id: noteId,
      title: "",
      summary_text: text,
      created_at: "",
      calendar_event: null,
    };
  }
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
