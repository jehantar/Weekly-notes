import type { Meeting, Note } from "@/lib/types/database";
import { DAY_LABELS } from "@/lib/constants";

export type ParsedMeetingNotes = {
  meetingTitle: string;
  dayOfWeek: number;
  dayLabel: string;
  points: string[];
  questions: string[];
};

/**
 * Convert HTML to plain text lines.
 * Replaces block-level tags with newlines, strips all other tags.
 */
function htmlToLines(html: string): string[] {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Check if a line is a meeting title header.
 * Matches if the line is exactly the title, or starts with the title
 * (to handle "Backend Sync - notes" style headers).
 * Avoids substring matching to prevent "Fixed auth bug" matching "Auth".
 */
function matchesMeetingTitle(line: string, titles: string[]): string | null {
  const lower = line.toLowerCase().trim();
  for (const title of titles) {
    const titleLower = title.toLowerCase();
    if (
      lower === titleLower ||
      lower.startsWith(titleLower + " ") ||
      lower.startsWith(titleLower + ":")  ||
      lower.startsWith(titleLower + " -") ||
      lower.startsWith(titleLower + " –")
    ) {
      return title;
    }
  }
  return null;
}

/**
 * Parse all notes for a week into structured per-meeting data.
 * Returns an array of ParsedMeetingNotes, one per meeting that has notes.
 */
export function parseWeekNotes(
  notes: Note[],
  meetings: Meeting[]
): ParsedMeetingNotes[] {
  const result: ParsedMeetingNotes[] = [];

  // Group meetings by day
  const meetingsByDay = new Map<number, Meeting[]>();
  for (const m of meetings) {
    const list = meetingsByDay.get(m.day_of_week) ?? [];
    list.push(m);
    meetingsByDay.set(m.day_of_week, list);
  }

  for (const note of notes) {
    if (!note.content || note.content.trim().length === 0) continue;

    const dayMeetings = meetingsByDay.get(note.day_of_week) ?? [];
    const titles = dayMeetings
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => m.title);

    const lines = htmlToLines(note.content);
    const dayLabel = DAY_LABELS[note.day_of_week - 1] ?? `Day ${note.day_of_week}`;

    if (titles.length === 0) {
      // No meetings for this day — attribute all lines to "General Notes"
      const points: string[] = [];
      const questions: string[] = [];
      for (const line of lines) {
        if (line.endsWith("?")) {
          questions.push(line);
        } else {
          points.push(line);
        }
      }
      if (points.length > 0 || questions.length > 0) {
        result.push({
          meetingTitle: "General Notes",
          dayOfWeek: note.day_of_week,
          dayLabel,
          points,
          questions,
        });
      }
      continue;
    }

    // Split lines by meeting headers
    let currentTitle: string | null = null;
    const sections = new Map<string, { points: string[]; questions: string[] }>();

    for (const line of lines) {
      const matched = matchesMeetingTitle(line, titles);
      if (matched) {
        currentTitle = matched;
        if (!sections.has(currentTitle)) {
          sections.set(currentTitle, { points: [], questions: [] });
        }
        continue;
      }

      // If no meeting matched yet, attribute to first meeting
      if (!currentTitle) {
        currentTitle = titles[0];
        if (!sections.has(currentTitle)) {
          sections.set(currentTitle, { points: [], questions: [] });
        }
      }

      const section = sections.get(currentTitle)!;
      if (line.endsWith("?")) {
        section.questions.push(line);
      } else {
        section.points.push(line);
      }
    }

    for (const [title, { points, questions }] of sections) {
      if (points.length > 0 || questions.length > 0) {
        result.push({
          meetingTitle: title,
          dayOfWeek: note.day_of_week,
          dayLabel,
          points,
          questions,
        });
      }
    }
  }

  result.sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  return result;
}
