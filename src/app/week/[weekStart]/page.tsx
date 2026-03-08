import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWeekStart, formatWeekStart, getMonday } from "@/lib/utils/dates";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { WeekProvider, type WeekData } from "@/components/providers/week-provider";
import { TasksProvider } from "@/components/providers/tasks-provider";
import { WeekClient } from "./week-client";
import type { Week, Meeting, Note, Task, Tag, WeekSummary } from "@/lib/types/database";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  const { weekStart } = await params;

  // Validate the weekStart param is a valid Monday
  const parsed = parseWeekStart(weekStart);
  if (isNaN(parsed.getTime())) {
    redirect(`/week/${formatWeekStart(getMonday())}`);
  }
  const monday = getMonday(parsed);
  const mondayStr = formatWeekStart(monday);
  if (mondayStr !== weekStart) {
    redirect(`/week/${mondayStr}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch tasks (user-scoped, not week-scoped)
  // Show active tasks + recently completed (last 14 days)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .or(`status.neq.done,completed_at.gte.${fourteenDaysAgo.toISOString()}`)
    .order("status")
    .order("sort_order");

  const initialTasks = (tasksData ?? []) as Task[];

  // Fetch tags, task_tags, summary, and week in parallel
  const taskIds = initialTasks.map((t) => t.id);
  const [tagsRes, taskTagsRes, summaryRes, weekRes] = await Promise.all([
    supabase.from("tags").select("*").eq("user_id", user.id),
    taskIds.length > 0
      ? supabase.from("task_tags").select("*").in("task_id", taskIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("week_summaries")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single(),
    supabase
      .from("weeks")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single(),
  ]);

  const initialTags = (tagsRes.data ?? []) as Tag[];
  const taskTagsMap: Record<string, string[]> = {};
  for (const row of taskTagsRes.data ?? []) {
    const { task_id, tag_id } = row as { task_id: string; tag_id: string };
    if (!taskTagsMap[task_id]) taskTagsMap[task_id] = [];
    taskTagsMap[task_id].push(tag_id);
  }
  const summaryData = summaryRes.data;

  const week = weekRes.data as Week | null;
  let initialData: WeekData;

  if (week) {
    const [meetingsRes, notesRes] = await Promise.all([
      supabase
        .from("meetings")
        .select("*")
        .eq("week_id", week.id)
        .order("day_of_week")
        .order("sort_order"),
      supabase
        .from("notes")
        .select("*")
        .eq("week_id", week.id)
        .order("day_of_week"),
    ]);

    initialData = {
      week,
      meetings: (meetingsRes.data ?? []) as Meeting[],
      notes: (notesRes.data ?? []) as Note[],
      summary: (summaryData as WeekSummary) ?? null,
    };
  } else {
    initialData = {
      week: null,
      meetings: [],
      notes: [],
      summary: (summaryData as WeekSummary) ?? null,
    };
  }

  return (
    <SupabaseProvider>
      <WeekProvider initialData={initialData}>
        <TasksProvider initialTasks={initialTasks} initialTags={initialTags} initialTaskTags={taskTagsMap}>
          <Suspense>
            <WeekClient weekStart={weekStart} weekExists={!!week} />
          </Suspense>
        </TasksProvider>
      </WeekProvider>
    </SupabaseProvider>
  );
}
