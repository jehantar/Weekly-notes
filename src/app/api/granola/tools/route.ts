import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGranolaClient } from "@/lib/granola-mcp";
import { getGranolaAccessToken } from "@/lib/granola-oauth";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getGranolaAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const mcpClient = await createGranolaClient(accessToken);
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "list") {
      // Call list_meetings for this week and return raw response
      const result = await mcpClient.callTool({
        name: "list_meetings",
        arguments: {
          time_range: "this_week",
        },
      });
      return NextResponse.json({ raw: result });
    }

    if (action === "get") {
      // Call get_meetings with a specific ID and return raw response
      const noteId = url.searchParams.get("id");
      if (!noteId) {
        return NextResponse.json({ error: "id param required" }, { status: 400 });
      }
      const result = await mcpClient.callTool({
        name: "get_meetings",
        arguments: { meeting_ids: [noteId] },
      });
      return NextResponse.json({ raw: result });
    }

    const { tools } = await mcpClient.listTools();
    return NextResponse.json({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    });
  } finally {
    await mcpClient.close();
  }
}
