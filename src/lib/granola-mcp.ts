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

  try {
    const parsed = JSON.parse(text);
    // Handle both array and { meetings: [...] } shapes
    const meetings = (
      Array.isArray(parsed) ? parsed : parsed.meetings ?? parsed.notes ?? []
    ) as Array<Record<string, unknown>>;
    return meetings.map((m) => ({
      id: m.id as string,
      title: (m.title ?? "") as string,
      created_at: (m.created_at ?? m.start_time ?? m.date ?? "") as string,
    }));
  } catch {
    // Response might be markdown/natural language — can't parse as structured data
    console.error("list_meetings returned non-JSON:", text.slice(0, 200));
    return [];
  }
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

  try {
    const parsed = JSON.parse(text);
    // Could be { meetings: [{ ... }] } or [{ ... }] or { ... }
    const meeting = Array.isArray(parsed)
      ? parsed[0]
      : parsed.meetings?.[0] ?? parsed;

    return {
      id: meeting?.id ?? noteId,
      title: meeting?.title ?? "",
      summary_text: meeting?.summary_text ?? meeting?.summary ?? meeting?.notes ?? text,
      created_at: meeting?.created_at ?? meeting?.start_time ?? "",
      calendar_event: meeting?.calendar_event ?? null,
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
