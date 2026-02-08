"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Week, Meeting, ActionItem, Note } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

export type WeekData = {
  week: Week | null;
  meetings: Meeting[];
  actionItems: ActionItem[];
  notes: Note[];
};

type WeekContextType = WeekData & {
  weekId: string | null;
  // Meetings
  addMeeting: (dayOfWeek: number, title: string) => Promise<Meeting | null>;
  updateMeeting: (id: string, title: string) => Promise<void>;
  deleteMeeting: (id: string) => void;
  // Action Items
  addActionItem: (dayOfWeek: number, content: string) => Promise<ActionItem | null>;
  updateActionItem: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  deleteActionItem: (id: string) => void;
  toggleDone: (id: string) => Promise<void>;
  setPriority: (id: string, priority: number) => Promise<void>;
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
  const [actionItems, setActionItems] = useState(initialData.actionItems);
  const [notes, setNotes] = useState(initialData.notes);

  const weekId = week?.id ?? null;

  const setWeekData = useCallback((data: WeekData) => {
    setWeek(data.week);
    setMeetings(data.meetings);
    setActionItems(data.actionItems);
    setNotes(data.notes);
  }, []);

  // --- Meetings ---

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
      // Find old title for tag updates
      const oldMeeting = meetings.find((m) => m.id === id);
      const oldTitle = oldMeeting?.title;

      setMeetings((prev) =>
        prev.map((m) => (m.id === id ? { ...m, title } : m))
      );

      // Update #tag text in linked action items
      if (oldTitle && oldTitle !== title) {
        setActionItems((prev) =>
          prev.map((ai) => {
            if (ai.meeting_id !== id) return ai;
            const newContent = ai.content.replace(
              `#${oldTitle}`,
              `#${title}`
            );
            if (newContent !== ai.content) {
              supabase
                .from("action_items")
                .update({ content: newContent })
                .eq("id", ai.id);
              return { ...ai, content: newContent };
            }
            return ai;
          })
        );
      }

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

      // Optimistic: remove from state
      setMeetings((prev) => prev.filter((m) => m.id !== id));
      // Clear meeting_id and remove #tag text from linked action items
      setActionItems((prev) =>
        prev.map((ai) => {
          if (ai.meeting_id !== id) return ai;
          const cleanedContent = ai.content
            .replace(`#${meeting.title}`, "")
            .trim();
          return { ...ai, meeting_id: null, content: cleanedContent };
        })
      );

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
            // Restore meeting_id links
            setActionItems((prev) =>
              prev.map((ai) => {
                const original = actionItems.find((o) => o.id === ai.id);
                if (original?.meeting_id === id) {
                  return { ...ai, meeting_id: id };
                }
                return ai;
              })
            );
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [meetings, actionItems, supabase]
  );

  // --- Action Items ---

  const addActionItem = useCallback(
    async (
      dayOfWeek: number,
      content: string
    ): Promise<ActionItem | null> => {
      if (!weekId) return null;
      const dayItems = actionItems.filter(
        (ai) => ai.day_of_week === dayOfWeek
      );
      const maxOrder = dayItems.reduce(
        (max, ai) => Math.max(max, ai.sort_order),
        -1
      );

      const { data, error } = await supabase
        .from("action_items")
        .insert({
          week_id: weekId,
          day_of_week: dayOfWeek,
          content,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to save action item");
        return null;
      }
      setActionItems((prev) => [...prev, data]);
      return data;
    },
    [weekId, actionItems, supabase]
  );

  const updateActionItem = useCallback(
    async (id: string, updates: Partial<ActionItem>) => {
      const prev = actionItems.find((ai) => ai.id === id);
      setActionItems((items) =>
        items.map((ai) => (ai.id === id ? { ...ai, ...updates } : ai))
      );
      const { error } = await supabase.from("action_items").update(updates).eq("id", id);
      if (error) {
        if (prev) {
          setActionItems((items) =>
            items.map((ai) => (ai.id === id ? prev : ai))
          );
        }
        toast.error("Failed to save action item");
      }
    },
    [actionItems, supabase]
  );

  const deleteActionItem = useCallback(
    (id: string) => {
      const item = actionItems.find((ai) => ai.id === id);
      if (!item) return;

      setActionItems((prev) => prev.filter((ai) => ai.id !== id));

      const timeout = setTimeout(async () => {
        const { error } = await supabase.from("action_items").delete().eq("id", id);
        if (error) {
          setActionItems((prev) => [...prev, item]);
          toast.error("Failed to delete action item");
        }
      }, UNDO_TIMEOUT);

      toast("Action item deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setActionItems((prev) => [...prev, item]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [actionItems, supabase]
  );

  const toggleDone = useCallback(
    async (id: string) => {
      const item = actionItems.find((ai) => ai.id === id);
      if (!item) return;
      const newDone = !item.is_done;
      setActionItems((prev) =>
        prev.map((ai) => (ai.id === id ? { ...ai, is_done: newDone } : ai))
      );
      const { error } = await supabase
        .from("action_items")
        .update({ is_done: newDone })
        .eq("id", id);
      if (error) {
        setActionItems((prev) =>
          prev.map((ai) => (ai.id === id ? { ...ai, is_done: !newDone } : ai))
        );
        toast.error("Failed to update action item");
      }
    },
    [actionItems, supabase]
  );

  const setPriority = useCallback(
    async (id: string, priority: number) => {
      const prev = actionItems.find((ai) => ai.id === id);
      setActionItems((items) =>
        items.map((ai) => (ai.id === id ? { ...ai, priority } : ai))
      );
      const { error } = await supabase
        .from("action_items")
        .update({ priority })
        .eq("id", id);
      if (error) {
        if (prev) {
          setActionItems((items) =>
            items.map((ai) => (ai.id === id ? { ...ai, priority: prev.priority } : ai))
          );
        }
        toast.error("Failed to update priority");
      }
    },
    [actionItems, supabase]
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
        actionItems,
        notes,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addActionItem,
        updateActionItem,
        deleteActionItem,
        toggleDone,
        setPriority,
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
