import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createGranolaClient,
  fetchNotesForRange,
  queryMeetingSummary,
  titlesMatch,
} from "@/lib/granola-mcp";
import type { GranolaNoteListItem } from "@/lib/granola-mcp";
import type { Meeting } from "@/lib/types/database";
import { getGranolaAccessToken } from "@/lib/granola-oauth";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getGranolaAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Granola not connected. Please connect your account first." },
      { status: 401 }
    );
  }

  const { weekStart, weekId } = await request.json();
  if (!weekStart || !weekId) {
    return NextResponse.json(
      { error: "weekStart and weekId are required" },
      { status: 400 }
    );
  }

  let mcpClient;
  try {
    mcpClient = await createGranolaClient(accessToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Granola MCP connection failed:", message);
    return NextResponse.json(
      { error: `Failed to connect to Granola: ${message}` },
      { status: 502 }
    );
  }

  try {
    // Compute date range: Monday 00:00 to Saturday 00:00 (covers Mon-Fri)
    const monday = new Date(`${weekStart}T00:00:00Z`);
    const saturday = new Date(monday);
    saturday.setUTCDate(saturday.getUTCDate() + 5);
    const afterDate = monday.toISOString();
    const beforeDate = saturday.toISOString();

    // Fetch Granola notes and meetings in parallel
    const [granolaNotes, meetingsRes] = await Promise.all([
      fetchNotesForRange(mcpClient, afterDate, beforeDate),
      supabase
        .from("meetings")
        .select("*")
        .eq("week_id", weekId),
    ]);

    const meetings = (meetingsRes.data ?? []) as Meeting[];
    if (meetings.length === 0 || granolaNotes.length === 0) {
      return NextResponse.json({ matched: 0 });
    }

    // Match Granola notes to meetings
    const consumed = new Set<string>();
    const matches: { meeting: Meeting; granolaNoteId: string }[] = [];

    for (const meeting of meetings) {
      // Find best matching Granola note
      let bestMatch: GranolaNoteListItem | null = null;

      for (const note of granolaNotes) {
        if (consumed.has(note.id)) continue;
        if (!titlesMatch(meeting.title, note.title)) continue;

        // Prefer same-day match
        const noteDate = new Date(note.created_at);
        const meetingDate = new Date(monday);
        meetingDate.setUTCDate(
          meetingDate.getUTCDate() + meeting.day_of_week - 1
        );

        const sameDay =
          noteDate.getUTCFullYear() === meetingDate.getUTCFullYear() &&
          noteDate.getUTCMonth() === meetingDate.getUTCMonth() &&
          noteDate.getUTCDate() === meetingDate.getUTCDate();

        if (sameDay || !bestMatch) {
          bestMatch = note;
          if (sameDay) break; // Exact day match, stop looking
        }
      }

      if (bestMatch) {
        consumed.add(bestMatch.id);
        matches.push({ meeting, granolaNoteId: bestMatch.id });
      }
    }

    // Fetch details and update meetings
    for (const { meeting, granolaNoteId } of matches) {
      const summary = await queryMeetingSummary(mcpClient, granolaNoteId);
      await supabase
        .from("meetings")
        .update({
          granola_note_id: granolaNoteId,
          granola_summary: summary,
        })
        .eq("id", meeting.id);
    }

    return NextResponse.json({ matched: matches.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Granola sync failed:", message);
    return NextResponse.json(
      { error: `Granola sync failed: ${message}` },
      { status: 500 }
    );
  } finally {
    await mcpClient.close();
  }
}
