"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useWeek } from "@/components/providers/week-provider";
import { parseWeekStart, formatDayHeader } from "@/lib/utils/dates";
import { DAYS_OF_WEEK, DAY_LABELS } from "@/lib/constants";
import type { Week, Meeting } from "@/lib/types/database";

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
  const monday = parseWeekStart(weekStart);

  const [templateMeetings, setTemplateMeetings] = useState<TemplateMeeting[]>(
    []
  );
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

  const createWeek = async () => {
    setCreating(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

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

    setWeekData({
      week: newWeek,
      meetings: insertedMeetings,
      notes: [],
    });

    setCreating(false);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <div className="p-6 max-w-2xl w-full shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <h2 className="text-lg font-bold mb-1">Create Week</h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Set up meetings for the week of{" "}
          {formatDayHeader(monday, 1).split(" ")[1]}
        </p>

        {templateMeetings.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: 'var(--text-placeholder)' }}>
            No previous week found. Starting blank.
          </p>
        ) : (
          <p className="text-xs mb-4" style={{ color: 'var(--text-placeholder)' }}>
            Meetings cloned from previous week. Uncheck to remove, change day
            as needed.
          </p>
        )}

        <div className="grid grid-cols-5 gap-2 mb-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayMeetings = templateMeetings
              .map((m, i) => ({ ...m, index: i }))
              .filter((m) => m.day_of_week === day);
            return (
              <div key={day} className="p-2" style={{ border: '1px solid var(--border-card)' }}>
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
                        className={m.included ? "" : "line-through"}
                        style={m.included ? undefined : { color: 'var(--text-placeholder)' }}
                      >
                        {m.title}
                      </span>
                      <select
                        value={m.day_of_week}
                        onChange={(e) =>
                          moveMeeting(m.index, Number(e.target.value))
                        }
                        className="ml-auto text-[10px]"
                        style={{ border: '1px solid var(--border-card)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
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
                  className="text-xs mt-1 transition-colors"
                  style={{ color: 'var(--text-placeholder)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
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
            className="px-4 py-1.5 text-sm transition-colors"
            style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={createWeek}
            disabled={creating}
            className="px-4 py-1.5 text-sm disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'var(--accent-purple)', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Create Week
          </button>
        </div>
      </div>
    </div>
  );
}
