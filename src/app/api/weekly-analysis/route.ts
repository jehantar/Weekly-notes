import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseWeekNotes } from "@/lib/utils/parse-notes";
import { differenceInCalendarDays } from "date-fns";
import { addDays, parseWeekStart } from "@/lib/utils/dates";
import { DAY_LABELS, THREAD_COLORS } from "@/lib/constants";
import type { Meeting, Note, Task, Tag } from "@/lib/types/database";
import { parseWeeklyAnalysis, type WeeklyAnalysis } from "@/lib/types/weekly-analysis";

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

  const mondayDate = parseWeekStart(weekStart);
  const weekEnd = addDays(mondayDate, 7).toISOString();
  const [meetingsRes, notesRes, tasksRes, tagsRes] = await Promise.all([
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
      .lt("completed_at", weekEnd),
    supabase.from("tags").select("*").eq("user_id", user.id),
  ]);

  const meetings = (meetingsRes.data ?? []) as Meeting[];
  const notes = (notesRes.data ?? []) as Note[];
  const completedTasks = (tasksRes.data ?? []) as Task[];
  const tags = (tagsRes.data ?? []) as Tag[];

  if (meetings.length === 0 && notes.length === 0) {
    return NextResponse.json(
      {
        error:
          "Add meetings and notes throughout the week, then generate your analysis",
      },
      { status: 400 }
    );
  }

  const parsedNotes = parseWeekNotes(notes, meetings);
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  // Fetch task_tags only for the completed tasks this week
  const completedTaskIds = completedTasks.map((t) => t.id);
  const taskTagsData =
    completedTaskIds.length > 0
      ? ((
          await supabase
            .from("task_tags")
            .select("*")
            .in("task_id", completedTaskIds)
        ).data ?? [])
      : [];

  const taskTagsByTaskId = new Map<string, string[]>();
  for (const tt of taskTagsData) {
    const list = taskTagsByTaskId.get(tt.task_id) ?? [];
    list.push(tt.tag_id);
    taskTagsByTaskId.set(tt.task_id, list);
  }

  const completedTasksForPrompt = completedTasks.map((task) => {
    let dayCompleted = 1;
    if (task.completed_at) {
      const diffDays = differenceInCalendarDays(new Date(task.completed_at), mondayDate);
      dayCompleted = Math.max(1, Math.min(5, diffDays + 1));
    }
    return {
      title: task.content,
      dayCompleted,
      tags: (taskTagsByTaskId.get(task.id) ?? [])
        .map((id) => tagMap.get(id))
        .filter(Boolean) as string[],
    };
  });

  const prompt = buildPrompt(parsedNotes, completedTasksForPrompt, weekStart);
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
  completedTasks: { title: string; dayCompleted: number; tags: string[] }[],
  weekStart: string
): string {
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
      const dayLabel = DAY_LABELS[task.dayCompleted - 1] ?? "";
      const tagSuffix = task.tags.length > 0 ? ` [${task.tags.join(", ")}]` : "";
      tasksSection += `- ${task.title} (completed ${dayLabel})${tagSuffix}\n`;
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
          "summary": "<1-2 sentence synthesis of what was discussed and why it matters — DO NOT copy bullet points, distill the key message>",
          "points": ["<2-4 concise takeaways or action items, rewritten for clarity — not raw notes>"]
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

1. **Threads**: Group related discussion points across different meetings into named threads. A thread represents a topic/theme that appeared in multiple meetings or was significant in one. Each thread should have a concise, descriptive name. For each appearance, write a **summary** that synthesizes the discussion into 1-2 articulate sentences capturing the key message — do NOT just restate the bullet points. The **points** should be concise, rewritten takeaways or action items (2-4 max), not verbatim copies of the raw notes.

2. **Open Questions**: Do NOT simply list every [QUESTION] tag from the notes. Instead, analyze the full context of the week's discussions and identify questions that remain **genuinely unanswered**. A question is answered if a later note, decision, or discussion point addresses it — exclude those. Also surface implicit open questions: gaps, ambiguities, or unresolved concerns you infer from the notes even if not explicitly tagged as [QUESTION]. The goal is a curated list of things the user still needs to follow up on.

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
          model: "google/gemini-3-flash-preview",
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

    // Gemini sometimes wraps output in markdown fencing despite instructions
    const jsonStr = content
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```$/m, "")
      .trim();

    const parsed = parseWeeklyAnalysis(jsonStr);
    if (!parsed) throw new Error("Invalid analysis structure");

    return parsed;
  } catch (err) {
    console.error("Analysis parse error:", err);
    if (retryCount < 1) {
      return callOpenRouter(apiKey, prompt, retryCount + 1);
    }
    return null;
  }
}
