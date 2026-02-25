"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Week, Meeting, Note } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

export type WeekData = {
  week: Week | null;
  meetings: Meeting[];
  notes: Note[];
};

type WeekContextType = WeekData & {
  weekId: string | null;
  // Meetings
  addMeeting: (dayOfWeek: number, title: string) => Promise<Meeting | null>;
  updateMeeting: (id: string, title: string) => Promise<void>;
  deleteMeeting: (id: string) => void;
  refreshMeetings: () => Promise<void>;
  unlinkGranolaMeeting: (meetingId: string) => Promise<void>;
  // Notes
  upsertNote: (dayOfWeek: number, content: string) => Promise<void>;
  // Week
  setWeekData: (data: WeekData) => void;
};

const WeekContext = createContext<WeekContextType | undefined>(undefined);

export function WeekProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData: WeekData;
}) {
  const supabase = useSupabase();
  const [week, setWeek] = useState(initialData.week);
  const [meetings, setMeetings] = useState(initialData.meetings);
  const [notes, setNotes] = useState(initialData.notes);

  const weekId = week?.id ?? null;

  const setWeekData = useCallback((data: WeekData) => {
    setWeek(data.week);
    setMeetings(data.meetings);
    setNotes(data.notes);
  }, []);

  const refreshMeetings = useCallback(async () => {
    if (!weekId) return;
    const { data } = await supabase
      .from("meetings")
      .select("*")
      .eq("week_id", weekId)
      .order("day_of_week")
      .order("sort_order");
    if (data) {
      setMeetings(data as Meeting[]);
    }
  }, [weekId, supabase]);

  // --- Meetings ---

  const unlinkGranolaMeeting = useCallback(
    async (meetingId: string) => {
      const meeting = meetings.find((m) => m.id === meetingId);
      if (!meeting) return;

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? { ...m, granola_note_id: null, granola_summary: null }
            : m
        )
      );

      const { error } = await supabase
        .from("meetings")
        .update({ granola_note_id: null, granola_summary: null })
        .eq("id", meetingId);

      if (error) {
        setMeetings((prev) =>
          prev.map((m) => (m.id === meetingId ? meeting : m))
        );
        toast.error("Failed to unlink Granola note");
      }
    },
    [meetings, supabase]
  );

  const addMeeting = useCallback(
    async (dayOfWeek: number, title: string): Promise<Meeting | null> => {
      if (!weekId) return null;
      const maxOrder = meetings
        .filter((m) => m.day_of_week === dayOfWeek)
        .reduce((max, m) => Math.max(max, m.sort_order), -1);

      const { data, error } = await supabase
        .from("meetings")
        .insert({
          week_id: weekId,
          day_of_week: dayOfWeek,
          title,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to save meeting");
        return null;
      }
      setMeetings((prev) => [...prev, data]);
      return data;
    },
    [weekId, meetings, supabase]
  );

  const updateMeeting = useCallback(
    async (id: string, title: string) => {
      const oldMeeting = meetings.find((m) => m.id === id);
      const oldTitle = oldMeeting?.title;

      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, title } : m))
      );

      const { error } = await supabase.from("meetings").update({ title }).eq("id", id);
      if (error) {
        setMeetings((prev) =>
          prev.map((m) => (m.id === id ? { ...m, title: oldTitle ?? title } : m))
        );
        toast.error("Failed to save meeting");
      }
    },
    [meetings, supabase]
  );

  const deleteMeeting = useCallback(
    (id: string) => {
      const meeting = meetings.find((m) => m.id === id);
      if (!meeting) return;

      setMeetings((prev) => prev.filter((m) => m.id !== id));

      const timeout = setTimeout(async () => {
        const { error } = await supabase.from("meetings").delete().eq("id", id);
        if (error) {
          setMeetings((prev) => [...prev, meeting]);
          toast.error("Failed to delete meeting");
        }
      }, UNDO_TIMEOUT);

      toast("Meeting deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setMeetings((prev) => [...prev, meeting]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [meetings, supabase]
  );

  // --- Notes ---

  const upsertNote = useCallback(
    async (dayOfWeek: number, content: string) => {
      if (!weekId) return;
      const existing = notes.find(
        (n) => n.day_of_week === dayOfWeek
      );

      if (existing) {
        const oldContent = existing.content;
        setNotes((prev) =>
          prev.map((n) =>
            n.id === existing.id ? { ...n, content } : n
          )
        );
        const { error } = await supabase
          .from("notes")
          .update({ content })
          .eq("id", existing.id);
        if (error) {
          setNotes((prev) =>
            prev.map((n) =>
              n.id === existing.id ? { ...n, content: oldContent } : n
            )
          );
          toast.error("Failed to save note");
        }
      } else {
        const { data, error } = await supabase
          .from("notes")
          .insert({
            week_id: weekId,
            day_of_week: dayOfWeek,
            content,
          })
          .select()
          .single();

        if (error || !data) {
          toast.error("Failed to save note");
        } else {
          setNotes((prev) => [...prev, data]);
        }
      }
    },
    [weekId, notes, supabase]
  );

  return (
    <WeekContext.Provider
      value={{
        week,
        weekId,
        meetings,
        notes,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        refreshMeetings,
        unlinkGranolaMeeting,
        upsertNote,
        setWeekData,
      }}
    >
      {children}
    </WeekContext.Provider>
  );
}

export function useWeek() {
  const context = useContext(WeekContext);
  if (!context) {
    throw new Error("useWeek must be used within a WeekProvider");
  }
  return context;
}
