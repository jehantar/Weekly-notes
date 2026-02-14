"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useWeek } from "@/components/providers/week-provider";
import { parseWeekStart, addWeeks, formatWeekStart, formatDayHeader } from "@/lib/utils/dates";
import { DAYS_OF_WEEK, DAY_LABELS } from "@/lib/constants";
import { CarryoverModal } from "./carryover-modal";
import type { Week, Meeting, ActionItem } from "@/lib/types/database";

type TemplateMeeting = {
  title: string;
  day_of_week: number;
  included: boolean;
};

export function CreateWeekModal({
  weekStart,
  onClose,
}: {
  weekStart: string;
  onClose: () => void;
}) {
  const supabase = useSupabase();
  const { setWeekData } = useWeek();
  const router = useRouter();
  const monday = parseWeekStart(weekStart);

  const [step, setStep] = useState<"meetings" | "carryover">("meetings");
  const [templateMeetings, setTemplateMeetings] = useState<TemplateMeeting[]>(
    []
  );
  const [prevWeekItems, setPrevWeekItems] = useState<ActionItem[]>([]);
  const [prevWeekId, setPrevWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPreviousWeek();
  }, []);

  const loadPreviousWeek = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Find the most recent previous week
    const { data: prevWeekData } = await supabase
      .from("weeks")
      .select("*")
      .eq("user_id", user.id)
      .lt("week_start", weekStart)
      .order("week_start", { ascending: false })
      .limit(1)
      .single();

    const prevWeek = prevWeekData as Week | null;

    if (prevWeek) {
      setPrevWeekId(prevWeek.id);
      // Load meetings from previous week
      const { data: meetings } = await supabase
        .from("meetings")
        .select("*")
        .eq("week_id", prevWeek.id)
        .order("day_of_week")
        .order("sort_order");

      if (meetings) {
        setTemplateMeetings(
          (meetings as Meeting[]).map((m) => ({
            title: m.title,
            day_of_week: m.day_of_week,
            included: true,
          }))
        );
      }

      // Load unchecked action items
      const { data: items } = await supabase
        .from("action_items")
        .select("*")
        .eq("week_id", prevWeek.id)
        .eq("is_done", false)
        .order("day_of_week")
        .order("sort_order");

      if (items) {
        setPrevWeekItems(items as ActionItem[]);
      }
    }
    setLoading(false);
  };

  const toggleMeeting = (index: number) => {
    setTemplateMeetings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, included: !m.included } : m
      )
    );
  };

  const moveMeeting = (index: number, newDay: number) => {
    setTemplateMeetings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, day_of_week: newDay } : m
      )
    );
  };

  const addTemplateMeeting = (dayOfWeek: number) => {
    setTemplateMeetings((prev) => [
      ...prev,
      { title: "New meeting", day_of_week: dayOfWeek, included: true },
    ]);
  };

  const handleConfirmMeetings = () => {
    if (prevWeekItems.length > 0) {
      setStep("carryover");
    } else {
      createWeek([]);
    }
  };

  const createWeek = async (
    carryoverItems: { content: string; priority: number; day_of_week: number; meeting_id: string | null }[]
  ) => {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Create the week
    const { data: newWeekData, error: weekError } = await supabase
      .from("weeks")
      .insert({ user_id: user.id, week_start: weekStart })
      .select()
      .single();

    const newWeek = newWeekData as Week | null;
    if (weekError || !newWeek) {
      setCreating(false);
      return;
    }

    // Create meetings
    const includedMeetings = templateMeetings.filter((m) => m.included);
    let insertedMeetings: Meeting[] = [];
    if (includedMeetings.length > 0) {
      const { data } = await supabase
        .from("meetings")
        .insert(
          includedMeetings.map((m, i) => ({
            week_id: newWeek.id,
            day_of_week: m.day_of_week,
            title: m.title,
            sort_order: i,
          }))
        )
        .select();
      insertedMeetings = (data ?? []) as Meeting[];
    }

    // Create carryover action items
    let insertedItems: ActionItem[] = [];
    if (carryoverItems.length > 0) {
      const { data } = await supabase
        .from("action_items")
        .insert(
          carryoverItems.map((item, i) => ({
            week_id: newWeek.id,
            day_of_week: item.day_of_week,
            content: item.content,
            priority: item.priority,
            sort_order: i,
            meeting_id: null as string | null,
          }))
        )
        .select();
      insertedItems = (data ?? []) as ActionItem[];
    }

    setWeekData({
      week: newWeek,
      meetings: insertedMeetings,
      actionItems: insertedItems,
      notes: [],
    });

    setCreating(false);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
        <div className="p-6 max-w-2xl w-full shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (step === "carryover") {
    return (
      <CarryoverModal
        items={prevWeekItems}
        onConfirm={(items) => createWeek(items)}
        onBack={() => setStep("meetings")}
        creating={creating}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
      <div className="p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <h2 className="text-lg font-bold mb-1">Create Week</h2>
        <p className="text-xs text-gray-500 mb-4">
          Set up meetings for the week of{" "}
          {formatDayHeader(monday, 1).split(" ")[1]}
        </p>

        {templateMeetings.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">
            No previous week found. Starting blank.
          </p>
        ) : (
          <p className="text-xs text-gray-400 mb-4">
            Meetings cloned from previous week. Uncheck to remove, change day
            as needed.
          </p>
        )}

        {/* Meetings by day */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayMeetings = templateMeetings
              .map((m, i) => ({ ...m, index: i }))
              .filter((m) => m.day_of_week === day);
            return (
              <div key={day} className="border border-gray-200 p-2">
                <div className="text-xs font-bold mb-2">
                  {DAY_LABELS[day - 1]}
                </div>
                <div className="space-y-1">
                  {dayMeetings.map((m) => (
                    <div
                      key={m.index}
                      className="flex items-center gap-1 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={m.included}
                        onChange={() => toggleMeeting(m.index)}
                        className="shrink-0"
                      />
                      <span
                        className={
                          m.included ? "" : "line-through text-gray-300"
                        }
                      >
                        {m.title}
                      </span>
                      <select
                        value={m.day_of_week}
                        onChange={(e) =>
                          moveMeeting(m.index, Number(e.target.value))
                        }
                        className="ml-auto text-[10px] border border-gray-200 bg-white"
                      >
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>
                            {DAY_LABELS[d - 1]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => addTemplateMeeting(day)}
                  className="text-gray-300 hover:text-gray-500 text-xs mt-1"
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmMeetings}
            disabled={creating}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {prevWeekItems.length > 0 ? "Next: Carryover" : "Create Week"}
          </button>
        </div>
      </div>
    </div>
  );
}
