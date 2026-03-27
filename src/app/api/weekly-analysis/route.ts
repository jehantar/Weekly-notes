import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseWeekNotes } from "@/lib/utils/parse-notes";
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
