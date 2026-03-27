# Weekly Analysis Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static markdown summary tab with an AI-powered thread-based weekly analysis that groups notes across meetings into themes, surfaces open questions, and highlights key decisions.

**Architecture:** A new `POST /api/weekly-analysis` route fetches meetings/notes/tasks from Supabase, parses HTML notes into structured per-meeting data, sends it to Gemini 2.5 Flash via OpenRouter, and returns a typed JSON analysis. The existing `week_summaries.content` column stores the JSON string (no migration needed). The UI detects JSON vs markdown and renders the appropriate view. New components: `ThreadView`, `ThreadCard`, `AnalysisSections`. Existing `UpdatesView` becomes the orchestrator.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (cookie auth), OpenRouter API (OpenAI-compatible), Tailwind v4, sonner (toasts)

**Note on testing:** This project has no test framework configured. Steps focus on manual verification and type checking via `npx tsc --noEmit`.

---

## File Structure

```
NEW FILES:
  src/lib/types/weekly-analysis.ts    — TypeScript types for the analysis JSON shape
  src/lib/utils/parse-notes.ts        — HTML → structured per-meeting notes parser
  src/app/api/weekly-analysis/route.ts — POST endpoint: fetch data, call LLM, return JSON
  src/components/updates/thread-view.tsx    — Full thread-based analysis renderer
  src/components/updates/thread-card.tsx    — Single collapsible thread with timeline
  src/components/updates/analysis-sections.tsx — Open questions + key decisions sections

MODIFIED FILES:
  src/lib/constants.ts                      — Add THREAD_COLORS palette
  src/components/updates/updates-view.tsx   — Refactor: orchestrator with JSON/markdown detection
  src/components/updates/summary-list.tsx   — Support both JSON and markdown past analyses
```

---

### Task 1: Types and Constants

**Files:**
- Create: `src/lib/types/weekly-analysis.ts`
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Create the analysis types file**

Create `src/lib/types/weekly-analysis.ts`:

```typescript
export type ThreadAppearance = {
  meetingTitle: string;
  dayOfWeek: number;
  points: string[];
  questions: string[];
};

export type CompletedTaskRef = {
  title: string;
  dayCompleted: number;
  tags: string[];
};

export type Thread = {
  id: string;
  name: string;
  color: string;
  appearances: ThreadAppearance[];
  completedTasks: CompletedTaskRef[];
};

export type OpenQuestion = {
  question: string;
  source: string;
  dayOfWeek: number;
};

export type KeyDecision = {
  decision: string;
  source: string;
  dayOfWeek: number;
};

export type WeeklyAnalysis = {
  threads: Thread[];
  openQuestions: OpenQuestion[];
  keyDecisions: KeyDecision[];
  weekOverview: string;
};

/** Type guard: returns true if the string is valid WeeklyAnalysis JSON */
export function isWeeklyAnalysis(content: string): WeeklyAnalysis | null {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      Array.isArray(parsed.threads) &&
      Array.isArray(parsed.openQuestions) &&
      Array.isArray(parsed.keyDecisions) &&
      typeof parsed.weekOverview === "string"
    ) {
      return parsed as WeeklyAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Add thread colors to constants**

In `src/lib/constants.ts`, add at the end of the file:

```typescript
export const THREAD_COLORS = [
  "#848CD0", // purple
  "#6B9E78", // green
  "#C4A46B", // gold
  "#C47070", // red
  "#6BA5C4", // blue
  "#B07CC4", // violet
] as const;
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/weekly-analysis.ts src/lib/constants.ts
git commit -m "feat: add WeeklyAnalysis types and thread color palette"
```

---

### Task 2: Note Parsing Utility

**Files:**
- Create: `src/lib/utils/parse-notes.ts`

This utility converts HTML notes into structured per-meeting data. Each day's note content is HTML from TipTap. The parser:
1. Strips HTML tags, preserving line breaks
2. Matches lines against that day's meeting titles
3. Attributes bullet points to the matched meeting
4. Tags lines ending in `?` as questions

- [ ] **Step 1: Create the note parser**

Create `src/lib/utils/parse-notes.ts`:

```typescript
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
 * Uses case-insensitive includes for fuzzy matching — the header
 * in notes may not exactly match the meeting title.
 */
function matchesMeetingTitle(line: string, titles: string[]): string | null {
  const lower = line.toLowerCase();
  for (const title of titles) {
    if (lower === title.toLowerCase() || lower.includes(title.toLowerCase())) {
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

  // Sort by day, then by meeting sort_order within day
  result.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return 0;
  });

  return result;
}
```

- [ ] **Step 2: Manually verify the parser logic**

Open a Node REPL or add a temporary test log. Feed it sample HTML like:
```html
<p>Backend Sync</p><p>Token refresh is broken</p><p>Need to investigate OAuth flow</p>
```
With a meeting titled "Backend Sync" for day 1. Confirm it produces:
```json
{ "meetingTitle": "Backend Sync", "dayOfWeek": 1, "points": ["Token refresh is broken", "Need to investigate OAuth flow"], "questions": [] }
```

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/parse-notes.ts
git commit -m "feat: add HTML note parser for per-meeting structured data"
```

---

### Task 3: API Route — `POST /api/weekly-analysis`

**Files:**
- Create: `src/app/api/weekly-analysis/route.ts`

**Context:**
- Auth pattern: `createClient()` from `@/lib/supabase/server` (cookie-based)
- The route fetches meetings, notes, and completed tasks from Supabase, parses notes via `parseWeekNotes`, builds an LLM prompt, calls OpenRouter, and returns the typed `WeeklyAnalysis` JSON.
- Uses `OPENROUTER_API_KEY` env var.
- The week's data is fetched by first looking up the `weeks` table to get the `week_id`, then querying meetings/notes by `week_id` and tasks by `completed_at` date range.

- [ ] **Step 1: Create the API route**

Create `src/app/api/weekly-analysis/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseWeekNotes } from "@/lib/utils/parse-notes";
import { stripHtml } from "@/lib/utils/strings";
import { DAY_LABELS, THREAD_COLORS } from "@/lib/constants";
import type { Meeting, Note, Task, Tag } from "@/lib/types/database";
import type { WeeklyAnalysis } from "@/lib/types/weekly-analysis";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const weekStart: string = body.weekStart;
  if (!weekStart) {
    return NextResponse.json({ error: "Missing weekStart" }, { status: 400 });
  }

  // Look up the week record
  const { data: week } = await supabase
    .from("weeks")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  if (!week) {
    return NextResponse.json(
      { error: "No data found for this week" },
      { status: 404 }
    );
  }

  // Fetch meetings, notes, completed tasks, tags in parallel
  const [meetingsRes, notesRes, tasksRes, tagsRes, taskTagsRes] =
    await Promise.all([
      supabase
        .from("meetings")
        .select("*")
        .eq("week_id", week.id)
        .order("day_of_week")
        .order("sort_order"),
      supabase.from("notes").select("*").eq("week_id", week.id),
      supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("completed_at", weekStart)
        .lt(
          "completed_at",
          new Date(
            new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000
          ).toISOString()
        ),
      supabase.from("tags").select("*").eq("user_id", user.id),
      supabase.from("task_tags").select("*"),
    ]);

  const meetings = (meetingsRes.data ?? []) as Meeting[];
  const notes = (notesRes.data ?? []) as Note[];
  const completedTasks = (tasksRes.data ?? []) as Task[];
  const tags = (tagsRes.data ?? []) as Tag[];
  const taskTags = taskTagsRes.data ?? [];

  if (meetings.length === 0 && notes.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add meetings and notes throughout the week, then generate your analysis",
      },
      { status: 400 }
    );
  }

  // Parse notes into per-meeting structured data
  const parsedNotes = parseWeekNotes(notes, meetings);

  // Build tag lookup
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  // Build completed tasks with tag names
  const completedTasksForPrompt = completedTasks.map((task) => {
    const tagIds = taskTags
      .filter((tt) => tt.task_id === task.id)
      .map((tt) => tt.tag_id);
    const tagNames = tagIds
      .map((id) => tagMap.get(id))
      .filter(Boolean) as string[];
    return {
      title: task.content,
      completedAt: task.completed_at,
      tags: tagNames,
    };
  });

  // Build the LLM prompt
  const prompt = buildPrompt(parsedNotes, completedTasksForPrompt, weekStart);

  // Call OpenRouter
  const analysis = await callOpenRouter(apiKey, prompt);
  if (!analysis) {
    return NextResponse.json(
      { error: "Analysis generation failed — try again" },
      { status: 500 }
    );
  }

  return NextResponse.json(analysis);
}

function buildPrompt(
  parsedNotes: ReturnType<typeof parseWeekNotes>,
  completedTasks: { title: string; completedAt: string | null; tags: string[] }[],
  weekStart: string
): string {
  // Group parsed notes by day
  const notesByDay = new Map<number, typeof parsedNotes>();
  for (const note of parsedNotes) {
    const list = notesByDay.get(note.dayOfWeek) ?? [];
    list.push(note);
    notesByDay.set(note.dayOfWeek, list);
  }

  let meetingSection = "";
  for (let day = 1; day <= 5; day++) {
    const dayNotes = notesByDay.get(day);
    if (!dayNotes || dayNotes.length === 0) continue;

    meetingSection += `\n### ${DAY_LABELS[day - 1]}\n`;
    for (const mn of dayNotes) {
      meetingSection += `\n**${mn.meetingTitle}**\n`;
      for (const point of mn.points) {
        meetingSection += `- ${point}\n`;
      }
      for (const q of mn.questions) {
        meetingSection += `- [QUESTION] ${q}\n`;
      }
    }
  }

  let tasksSection = "";
  if (completedTasks.length > 0) {
    tasksSection = "\n## Completed Tasks This Week\n";
    for (const task of completedTasks) {
      const tagSuffix = task.tags.length > 0 ? ` [${task.tags.join(", ")}]` : "";
      tasksSection += `- ${task.title}${tagSuffix}\n`;
    }
  }

  const threadColorsStr = THREAD_COLORS.map(
    (c, i) => `${i + 1}. "${c}"`
  ).join(", ");

  return `You are analyzing a week's worth of meeting notes and completed tasks for a professional.

## Meeting Notes for Week of ${weekStart}
${meetingSection}
${tasksSection}

## Instructions

Analyze the above meeting notes and tasks. Return a JSON object with this exact structure:

{
  "threads": [
    {
      "id": "<unique-id>",
      "name": "<thread name - a short theme/topic>",
      "color": "<one of the colors below>",
      "appearances": [
        {
          "meetingTitle": "<meeting where this theme appeared>",
          "dayOfWeek": <1-5>,
          "points": ["<relevant discussion points>"],
          "questions": ["<questions related to this thread>"]
        }
      ],
      "completedTasks": [
        {
          "title": "<task title>",
          "dayCompleted": <1-5 based on day of week>,
          "tags": ["<tag names>"]
        }
      ]
    }
  ],
  "openQuestions": [
    {
      "question": "<the question text>",
      "source": "<meeting title where it appeared>",
      "dayOfWeek": <1-5>
    }
  ],
  "keyDecisions": [
    {
      "decision": "<the decision>",
      "source": "<meeting title>",
      "dayOfWeek": <1-5>
    }
  ],
  "weekOverview": "<1-2 sentence narrative summary of the week>"
}

## Guidelines

1. **Threads**: Group related discussion points across different meetings into named threads. A thread represents a topic/theme that appeared in multiple meetings or was significant in one. Each thread should have a concise, descriptive name.

2. **Questions**: Lines marked [QUESTION] are things the user planned to ask in meetings. Include them in the relevant thread's appearances AND in the openQuestions list.

3. **Key Decisions**: Look for declarative statements like "decided to", "going with", "agreed on", "will do" — these indicate decisions made during meetings.

4. **Completed Tasks**: Match completed tasks to relevant threads based on content and tags. A task can belong to at most one thread.

5. **Thread Colors**: Assign colors from this palette in order of thread prominence: ${threadColorsStr}

6. **IDs**: Generate short unique IDs for threads (e.g., "thread-1", "thread-2").

Return ONLY the JSON object, no markdown fencing, no explanation.`;
}

async function callOpenRouter(
  apiKey: string,
  prompt: string,
  retryCount = 0
): Promise<WeeklyAnalysis | null> {
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      }
    );

    if (!response.ok) {
      console.error("OpenRouter API error:", response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown fencing if present
    const jsonStr = content
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();

    const parsed = JSON.parse(jsonStr) as WeeklyAnalysis;

    // Basic validation
    if (
      !Array.isArray(parsed.threads) ||
      !Array.isArray(parsed.openQuestions) ||
      !Array.isArray(parsed.keyDecisions) ||
      typeof parsed.weekOverview !== "string"
    ) {
      throw new Error("Invalid analysis structure");
    }

    return parsed;
  } catch (err) {
    console.error("Analysis parse error:", err);
    if (retryCount < 1) {
      return callOpenRouter(apiKey, prompt, retryCount + 1);
    }
    return null;
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/weekly-analysis/route.ts
git commit -m "feat: add POST /api/weekly-analysis endpoint with OpenRouter LLM integration"
```

---

### Task 4: Thread Card Component

**Files:**
- Create: `src/components/updates/thread-card.tsx`

**Context:**
- Each thread card shows a colored dot + name + meeting count
- Collapsible timeline showing appearances chronologically
- Questions highlighted in gold, completed tasks with checkmark
- Uses CSS variables from the design system (no border-radius except dots)

- [ ] **Step 1: Create the thread card component**

Create `src/components/updates/thread-card.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Thread } from "@/lib/types/weekly-analysis";
import { DAY_LABELS } from "@/lib/constants";

export function ThreadCard({ thread }: { thread: Thread }) {
  const [expanded, setExpanded] = useState(true);

  const meetingCount = thread.appearances.length;

  return (
    <div style={{ border: "1px solid var(--border-card)" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: thread.color }}
        />
        <span
          className="text-xs font-medium flex-1"
          style={{ color: "var(--text-primary)" }}
        >
          {thread.name}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
          {meetingCount} {meetingCount === 1 ? "meeting" : "meetings"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {/* Timeline */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-3"
          style={{
            borderTop: "1px solid var(--border-card)",
            backgroundColor: "var(--bg-column)",
          }}
        >
          {thread.appearances.map((appearance, i) => {
            const dayLabel = DAY_LABELS[appearance.dayOfWeek - 1] ?? "";
            return (
              <div key={i} className="pt-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: thread.color }}
                  >
                    {dayLabel}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-placeholder)" }}
                  >
                    ·
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {appearance.meetingTitle}
                  </span>
                </div>
                <div className="space-y-1 ml-0.5">
                  {appearance.points.map((point, j) => (
                    <div
                      key={`p-${j}`}
                      className="text-xs flex gap-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span style={{ color: "var(--text-placeholder)" }}>-</span>
                      <span>{point}</span>
                    </div>
                  ))}
                  {appearance.questions.map((question, j) => (
                    <div
                      key={`q-${j}`}
                      className="text-xs flex gap-1.5"
                      style={{ color: "#C4A46B" }}
                    >
                      <span>?</span>
                      <span>{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {thread.completedTasks.length > 0 && (
            <div className="pt-2.5" style={{ borderTop: "1px solid var(--border-card)" }}>
              {thread.completedTasks.map((task, i) => {
                const dayLabel = DAY_LABELS[task.dayCompleted - 1] ?? "";
                return (
                  <div
                    key={`t-${i}`}
                    className="text-xs flex gap-1.5 py-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span style={{ color: "#6B9E78" }}>&#10003;</span>
                    <span>
                      {task.title}
                      <span
                        className="ml-1"
                        style={{ color: "var(--text-placeholder)" }}
                      >
                        (completed {dayLabel})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/updates/thread-card.tsx
git commit -m "feat: add ThreadCard component for collapsible thread timeline"
```

---

### Task 5: Analysis Sections Component

**Files:**
- Create: `src/components/updates/analysis-sections.tsx`

**Context:**
- Open Questions section: gold accent, `?` icon, flat list
- Key Decisions section: green accent, `→` icon, flat list
- Section headers are uppercase, tracked, colored

- [ ] **Step 1: Create the analysis sections component**

Create `src/components/updates/analysis-sections.tsx`:

```tsx
"use client";

import type { OpenQuestion, KeyDecision } from "@/lib/types/weekly-analysis";
import { DAY_LABELS } from "@/lib/constants";

export function OpenQuestionsSection({
  questions,
}: {
  questions: OpenQuestion[];
}) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: "#C4A46B" }}
      >
        Open Questions
      </h3>
      <div className="space-y-2">
        {questions.map((q, i) => {
          const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
          return (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0" style={{ color: "#C4A46B" }}>
                ?
              </span>
              <div>
                <span style={{ color: "var(--text-primary)" }}>
                  {q.question}
                </span>
                <span
                  className="ml-2"
                  style={{ color: "var(--text-placeholder)" }}
                >
                  {q.source} · {dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KeyDecisionsSection({
  decisions,
}: {
  decisions: KeyDecision[];
}) {
  if (decisions.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: "#6B9E78" }}
      >
        Key Decisions
      </h3>
      <div className="space-y-2">
        {decisions.map((d, i) => {
          const dayLabel = DAY_LABELS[d.dayOfWeek - 1] ?? "";
          return (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0" style={{ color: "#6B9E78" }}>
                &rarr;
              </span>
              <div>
                <span style={{ color: "var(--text-primary)" }}>
                  {d.decision}
                </span>
                <span
                  className="ml-2"
                  style={{ color: "var(--text-placeholder)" }}
                >
                  {d.source} · {dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/updates/analysis-sections.tsx
git commit -m "feat: add OpenQuestions and KeyDecisions section components"
```

---

### Task 6: Thread View Component

**Files:**
- Create: `src/components/updates/thread-view.tsx`

**Context:**
- This is the main renderer for a `WeeklyAnalysis` object
- Renders: week overview (blockquote), threads section, open questions, key decisions
- Receives the parsed analysis as a prop — no data fetching

- [ ] **Step 1: Create the thread view component**

Create `src/components/updates/thread-view.tsx`:

```tsx
"use client";

import type { WeeklyAnalysis } from "@/lib/types/weekly-analysis";
import { ThreadCard } from "./thread-card";
import {
  OpenQuestionsSection,
  KeyDecisionsSection,
} from "./analysis-sections";

export function ThreadView({ analysis }: { analysis: WeeklyAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Week Overview */}
      {analysis.weekOverview && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            borderLeft: "2px solid var(--accent-purple)",
            color: "var(--text-secondary)",
            backgroundColor: "color-mix(in srgb, var(--accent-purple) 5%, transparent)",
          }}
        >
          {analysis.weekOverview}
        </div>
      )}

      {/* Threads */}
      {analysis.threads.length > 0 && (
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--accent-purple)" }}
          >
            Threads
          </h3>
          <div className="space-y-2">
            {analysis.threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </div>
      )}

      {/* Open Questions */}
      <OpenQuestionsSection questions={analysis.openQuestions} />

      {/* Key Decisions */}
      <KeyDecisionsSection decisions={analysis.keyDecisions} />
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/updates/thread-view.tsx
git commit -m "feat: add ThreadView component assembling analysis sections"
```

---

### Task 7: Refactor UpdatesView — Orchestrator

**Files:**
- Modify: `src/components/updates/updates-view.tsx`

**Context:**
- The current `updates-view.tsx` is 167 lines. It generates a local markdown summary, has edit/regenerate buttons, autosave, and renders `SummaryList`.
- The new version needs to:
  1. Detect JSON vs markdown in `summary.content` via `isWeeklyAnalysis()`
  2. If JSON → render `ThreadView` + generate/regenerate/edit buttons
  3. If markdown → render `SummaryMarkdown` (backward compatible)
  4. "Generate Analysis" calls `POST /api/weekly-analysis` instead of local generation
  5. Edit mode converts JSON to markdown (one-way), saves as markdown
  6. Loading state with spinner on button
  7. Keep `SummaryList` for past analyses
- The `upsertSummary` function from WeekProvider saves the string to DB. We call it with `JSON.stringify(analysis)` for thread data, or plain markdown for edit mode.

- [ ] **Step 1: Rewrite updates-view.tsx**

Replace the entire content of `src/components/updates/updates-view.tsx` with:

```tsx
"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { SummaryList } from "./summary-list";
import { SummaryMarkdown } from "./summary-markdown";
import { ThreadView } from "./thread-view";
import { AUTOSAVE_DELAY } from "@/lib/constants";
import { addDays, formatWeekRange } from "@/lib/utils/dates";
import { isWeeklyAnalysis } from "@/lib/types/weekly-analysis";
import type { WeeklyAnalysis } from "@/lib/types/weekly-analysis";
import { DAY_LABELS } from "@/lib/constants";
import { toast } from "sonner";

/** Convert a WeeklyAnalysis to readable markdown for editing. One-way conversion. */
function analysisToMarkdown(analysis: WeeklyAnalysis): string {
  const sections: string[] = [];

  if (analysis.weekOverview) {
    sections.push(`> ${analysis.weekOverview}`);
  }

  for (const thread of analysis.threads) {
    sections.push(`## ${thread.name}`);
    for (const a of thread.appearances) {
      const dayLabel = DAY_LABELS[a.dayOfWeek - 1] ?? "";
      sections.push(`### ${dayLabel} · ${a.meetingTitle}`);
      for (const p of a.points) {
        sections.push(`- ${p}`);
      }
      for (const q of a.questions) {
        sections.push(`- ? ${q}`);
      }
    }
    for (const t of thread.completedTasks) {
      const dayLabel = DAY_LABELS[t.dayCompleted - 1] ?? "";
      sections.push(`- ✓ ${t.title} (completed ${dayLabel})`);
    }
  }

  if (analysis.openQuestions.length > 0) {
    sections.push("## Open Questions");
    for (const q of analysis.openQuestions) {
      const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
      sections.push(`- ? ${q.question} — ${q.source} · ${dayLabel}`);
    }
  }

  if (analysis.keyDecisions.length > 0) {
    sections.push("## Key Decisions");
    for (const d of analysis.keyDecisions) {
      const dayLabel = DAY_LABELS[d.dayOfWeek - 1] ?? "";
      sections.push(`- → ${d.decision} — ${d.source} · ${dayLabel}`);
    }
  }

  return sections.join("\n\n");
}

export function UpdatesView({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  const { meetings, notes, summary, upsertSummary } = useWeek();
  const { tasks } = useTasks();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const weekLabel = useMemo(() => formatWeekRange(monday), [monday]);

  const weekEnd = useMemo(() => addDays(monday, 7), [monday]);
  const completedTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= monday && d < weekEnd;
      }),
    [tasks, monday, weekEnd]
  );

  // Parse current summary content
  const analysis = useMemo(
    () => (summary?.content ? isWeeklyAnalysis(summary.content) : null),
    [summary?.content]
  );

  const subtitle = useMemo(() => {
    const meetingCount = meetings.length;
    const noteDays = notes.filter((n) => n.content.trim().length > 0).length;
    return `${meetingCount} meeting${meetingCount !== 1 ? "s" : ""} · ${noteDays} day${noteDays !== 1 ? "s" : ""} of notes`;
  }, [meetings, notes]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to generate analysis");
        return;
      }

      const data: WeeklyAnalysis = await res.json();
      const content = JSON.stringify(data);
      await upsertSummary(content);
    } catch {
      toast.error("Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  }, [weekStart, upsertSummary]);

  const handleEdit = useCallback(() => {
    if (analysis) {
      setEditContent(analysisToMarkdown(analysis));
    } else {
      setEditContent(summary?.content ?? "");
    }
    setEditing(true);
  }, [analysis, summary?.content]);

  const handleContentChange = useCallback(
    (value: string) => {
      setEditContent(value);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => {
        upsertSummary(value);
      }, AUTOSAVE_DELAY);
    },
    [upsertSummary]
  );

  const handleDoneEditing = useCallback(() => {
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      upsertSummary(editContent);
    }
    setEditing(false);
  }, [editContent, upsertSummary]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Weekly Analysis
            </h2>
            <div className="flex items-center gap-2">
              {summary && !editing && (
                <button
                  onClick={handleEdit}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  Edit
                </button>
              )}
              {editing && (
                <button
                  onClick={handleDoneEditing}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)]"
                  style={{
                    color: "var(--accent-purple)",
                    border: "1px solid var(--accent-purple)",
                  }}
                >
                  Done
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-card)",
                }}
              >
                {loading
                  ? "Analyzing..."
                  : summary
                    ? "Regenerate"
                    : "Generate Analysis"}
              </button>
            </div>
          </div>
          <p
            className="text-[11px] mb-3"
            style={{ color: "var(--text-placeholder)" }}
          >
            {weekLabel} · {subtitle}
          </p>

          {/* Content area */}
          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full min-h-[300px] p-3 text-xs font-mono resize-y outline-none focus:border-[var(--accent-purple)]"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            />
          ) : analysis ? (
            <ThreadView analysis={analysis} />
          ) : summary ? (
            <div
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div
                className="text-xs space-y-3"
                style={{ color: "var(--text-primary)" }}
              >
                <SummaryMarkdown content={summary.content} />
              </div>
            </div>
          ) : (
            <div
              className="p-8 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px dashed var(--border-card)",
              }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Generate your weekly analysis
              </p>
              <p
                className="text-[11px] text-center max-w-xs"
                style={{ color: "var(--text-placeholder)" }}
              >
                Analyze your meetings and notes to find themes, connections, and
                open questions
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs px-3 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)] disabled:opacity-50"
                style={{
                  color: "var(--accent-purple)",
                  border: "1px solid var(--accent-purple)",
                }}
              >
                {loading ? "Analyzing..." : "Generate Analysis"}
              </button>
            </div>
          )}
        </div>

        {/* Past analyses */}
        <SummaryList currentWeekStart={weekStart} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/updates/updates-view.tsx
git commit -m "feat: refactor UpdatesView as orchestrator with JSON/markdown detection"
```

---

### Task 8: Update SummaryList for JSON Support

**Files:**
- Modify: `src/components/updates/summary-list.tsx`

**Context:**
- Past analyses stored as JSON strings should render as `ThreadView` when expanded
- Past analyses stored as markdown should render as `SummaryMarkdown` (unchanged)
- Detection via `isWeeklyAnalysis()` — same as `UpdatesView`

- [ ] **Step 1: Update summary-list.tsx to handle both formats**

In `src/components/updates/summary-list.tsx`, add the imports at the top (after existing imports):

```tsx
import { ThreadView } from "./thread-view";
import { isWeeklyAnalysis } from "@/lib/types/weekly-analysis";
```

Then replace the expanded content block. Find this code inside the `summaries.map()`:

```tsx
              {isExpanded && (
                <div
                  className="px-3 py-3 text-xs space-y-2"
                  style={{
                    borderTop: "1px solid var(--border-card)",
                    backgroundColor: "var(--bg-column)",
                  }}
                >
                  <SummaryMarkdown content={s.content} compact />
                </div>
              )}
```

Replace it with:

```tsx
              {isExpanded && (
                <div
                  className="px-3 py-3 text-xs space-y-2"
                  style={{
                    borderTop: "1px solid var(--border-card)",
                    backgroundColor: "var(--bg-column)",
                  }}
                >
                  {(() => {
                    const analysis = isWeeklyAnalysis(s.content);
                    return analysis ? (
                      <ThreadView analysis={analysis} />
                    ) : (
                      <SummaryMarkdown content={s.content} compact />
                    );
                  })()}
                </div>
              )}
```

Also update the section header text. Find:

```tsx
        Past Summaries
```

Replace with:

```tsx
        Past Analyses
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/updates/summary-list.tsx
git commit -m "feat: support both JSON thread view and markdown in past analyses"
```

---

### Task 9: Environment Setup and Manual Testing

**Files:**
- None created (env var in `.env.local` which is gitignored)

- [ ] **Step 1: Verify OPENROUTER_API_KEY is set**

Check that `.env.local` contains `OPENROUTER_API_KEY=sk-or-...`. If not, add it:

```bash
echo "OPENROUTER_API_KEY=your-key-here" >> .env.local
```

- [ ] **Step 2: Start dev server and test**

Run: `npm run dev`

Manual test checklist:
1. Navigate to any week with meetings and notes
2. Click the "Updates" tab
3. Verify empty state shows "Generate your weekly analysis" CTA
4. Click "Generate Analysis" — button should show "Analyzing..." spinner state
5. After completion, verify threads render with colored dots, collapsible timelines
6. Verify open questions appear in gold, key decisions in green
7. Verify week overview appears as purple-bordered blockquote
8. Click "Edit" — verify JSON converts to readable markdown in textarea
9. Click "Done" — verify it saves as markdown and renders via `SummaryMarkdown`
10. Click "Regenerate" — verify it calls the API again and renders fresh threads
11. Navigate to a different week and back — verify past analyses section shows both formats

- [ ] **Step 3: Test error states**

1. Temporarily remove `OPENROUTER_API_KEY` from `.env.local`, restart dev server, click Generate — verify toast shows "OpenRouter API key not configured"
2. Navigate to a week with no meetings/notes — verify toast shows appropriate message
3. Restore the API key

- [ ] **Step 4: Final type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit any fixes**

If any fixes were needed during testing, commit them:

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/types/weekly-analysis.ts` | Create | TypeScript types + `isWeeklyAnalysis` guard |
| `src/lib/constants.ts` | Modify | Add `THREAD_COLORS` palette |
| `src/lib/utils/parse-notes.ts` | Create | HTML → per-meeting structured notes parser |
| `src/app/api/weekly-analysis/route.ts` | Create | POST endpoint: Supabase fetch → LLM → JSON |
| `src/components/updates/thread-card.tsx` | Create | Collapsible thread with timeline |
| `src/components/updates/analysis-sections.tsx` | Create | Open questions + key decisions sections |
| `src/components/updates/thread-view.tsx` | Create | Full analysis renderer |
| `src/components/updates/updates-view.tsx` | Rewrite | Orchestrator with JSON/markdown detection |
| `src/components/updates/summary-list.tsx` | Modify | Support both JSON and markdown past analyses |
