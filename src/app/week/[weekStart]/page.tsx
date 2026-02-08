import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseWeekStart, formatWeekStart, getMonday } from "@/lib/utils/dates";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { WeekProvider, type WeekData } from "@/components/providers/week-provider";
import { WeekClient } from "./week-client";
import type { Week, Meeting, ActionItem, Note } from "@/lib/types/database";

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

  // Fetch the week
  const { data: weekData } = await supabase
    .from("weeks")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .single();

  const week = weekData as Week | null;
  let initialData: WeekData;

  if (week) {
    // Fetch all data for this week in parallel
    const [meetingsRes, actionItemsRes, notesRes] = await Promise.all([
      supabase
        .from("meetings")
        .select("*")
        .eq("week_id", week.id)
        .order("day_of_week")
        .order("sort_order"),
      supabase
        .from("action_items")
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
      actionItems: (actionItemsRes.data ?? []) as ActionItem[],
      notes: (notesRes.data ?? []) as Note[],
    };
  } else {
    initialData = {
      week: null,
      meetings: [],
      actionItems: [],
      notes: [],
    };
  }

  const granolaEnabled = !!process.env.GRANOLA_API_KEY;

  return (
    <SupabaseProvider>
      <WeekProvider initialData={initialData}>
        <WeekClient
          weekStart={weekStart}
          weekExists={!!week}
          granolaEnabled={granolaEnabled}
        />
      </WeekProvider>
    </SupabaseProvider>
  );
}
