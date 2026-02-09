import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGranolaClient } from "@/lib/granola-mcp";
import { getGranolaAccessToken } from "@/lib/granola-oauth";

export async function GET() {
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
