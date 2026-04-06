"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Week, Meeting, Note, WeekSummary, QuestionResolution, Screenshot } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

export type WeekData = {
  week: Week | null;
  meetings: Meeting[];
  notes: Note[];
  summary: WeekSummary | null;
  questionResolutions: QuestionResolution[];
  screenshots: Screenshot[];
};

type WeekContextType = WeekData & {
  weekId: string | null;
  // Meetings
  addMeeting: (dayOfWeek: number, title: string) => Promise<Meeting | null>;
  updateMeeting: (id: string, title: string) => Promise<void>;
  deleteMeeting: (id: string) => void;
  refreshMeetings: () => Promise<void>;
  // Notes
  upsertNote: (dayOfWeek: number, content: string) => Promise<void>;
  // Summary
  upsertSummary: (content: string) => Promise<void>;
  // Week
  setWeekData: (data: WeekData) => void;
  // Question resolutions
  questionResolutions: QuestionResolution[];
  resolveQuestion: (weekStart: string, questionText: string, questionHash: string, resolution?: string) => void;
  unresolveQuestion: (weekStart: string, questionHash: string) => void;
  updateResolutionText: (questionHash: string, resolution: string) => void;
  // Screenshots
  screenshots: Screenshot[];
  addScreenshot: (screenshot: Screenshot) => void;
  removeScreenshot: (id: string) => void;
  updateScreenshotCaption: (id: string, caption: string) => void;
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
  const [summary, setSummary] = useState(initialData.summary);
  const [questionResolutions, setQuestionResolutions] = useState(initialData.questionResolutions);
  const [screenshots, setScreenshots] = useState(initialData.screenshots);

  const weekId = week?.id ?? null;

  const setWeekData = useCallback((data: WeekData) => {
    setWeek(data.week);
    setMeetings(data.meetings);
    setNotes(data.notes);
    setSummary(data.summary);
    setQuestionResolutions(data.questionResolutions);
    setScreenshots(data.screenshots);
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

  const upsertSummary = useCallback(
    async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !week) return;

      const weekStart = week.week_start;

      if (summary) {
        // Update existing
        const old = summary;
        setSummary({ ...summary, content, updated_at: new Date().toISOString() });

        const { data, error } = await supabase
          .from("week_summaries")
          .update({ content })
          .eq("id", summary.id)
          .select("updated_at")
          .single();

        if (error) {
          setSummary(old);
          toast.error("Failed to save summary");
        } else if (data) {
          setSummary((prev) => prev ? { ...prev, updated_at: data.updated_at } : prev);
        }
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("week_summaries")
          .upsert(
            { user_id: user.id, week_start: weekStart, content },
            { onConflict: "user_id,week_start" }
          )
          .select()
          .single();

        if (error || !data) {
          toast.error("Failed to save summary");
        } else {
          setSummary(data as WeekSummary);
        }
      }
    },
    [supabase, week, summary]
  );

  // --- Question Resolutions ---

  const resolveQuestion = useCallback(
    (weekStart: string, questionText: string, questionHash: string, resolution?: string) => {
      const optimistic: QuestionResolution = {
        id: crypto.randomUUID(),
        user_id: "",
        week_start: weekStart,
        question_hash: questionHash,
        question_text: questionText,
        resolution: resolution ?? null,
        resolved_at: new Date().toISOString(),
      };

      setQuestionResolutions((prev) => [...prev, optimistic]);

      const timeout = setTimeout(async () => {
        const res = await fetch("/api/question-resolutions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolve", weekStart, questionText, resolution }),
        });
        if (!res.ok) {
          setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));
          toast.error("Failed to resolve question");
        } else {
          const saved = await res.json();
          setQuestionResolutions((prev) =>
            prev.map((r) => (r.question_hash === questionHash ? saved : r))
          );
        }
      }, UNDO_TIMEOUT);

      toast("Question resolved", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    []
  );

  const unresolveQuestion = useCallback(
    (weekStart: string, questionHash: string) => {
      const existing = questionResolutions.find((r) => r.question_hash === questionHash);

      setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));

      fetch("/api/question-resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unresolve", weekStart, questionHash }),
      }).then((res) => {
        if (!res.ok && existing) {
          setQuestionResolutions((prev) => [...prev, existing]);
          toast.error("Failed to reopen question");
        }
      });
    },
    [questionResolutions]
  );

  const updateResolutionText = useCallback(
    (questionHash: string, resolution: string) => {
      const existing = questionResolutions.find((r) => r.question_hash === questionHash);
      if (!existing) return;

      setQuestionResolutions((prev) =>
        prev.map((r) => (r.question_hash === questionHash ? { ...r, resolution } : r))
      );

      fetch("/api/question-resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          weekStart: existing.week_start,
          questionText: existing.question_text,
          resolution,
        }),
      }).then((res) => {
        if (!res.ok) {
          toast.error("Failed to save resolution");
        }
      });
    },
    [questionResolutions]
  );

  // --- Screenshots ---

  const addScreenshot = useCallback(
    (screenshot: Screenshot) => {
      setScreenshots((prev) => [screenshot, ...prev]);
    },
    []
  );

  const removeScreenshot = useCallback(
    (id: string) => {
      const screenshot = screenshots.find((s) => s.id === id);
      if (!screenshot) return;

      setScreenshots((prev) => prev.filter((s) => s.id !== id));

      const timeout = setTimeout(async () => {
        const res = await fetch("/api/screenshots", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          setScreenshots((prev) => [...prev, screenshot]);
          toast.error("Failed to delete screenshot");
        }
      }, UNDO_TIMEOUT);

      toast("Screenshot deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setScreenshots((prev) => [...prev, screenshot]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [screenshots]
  );

  const updateScreenshotCaption = useCallback(
    (id: string, caption: string) => {
      setScreenshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, caption } : s))
      );

      fetch("/api/screenshots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, caption }),
      }).then((res) => {
        if (!res.ok) {
          toast.error("Failed to save caption");
        }
      });
    },
    []
  );

  return (
    <WeekContext.Provider
      value={{
        week,
        weekId,
        meetings,
        notes,
        summary,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        refreshMeetings,
        upsertNote,
        upsertSummary,
        setWeekData,
        questionResolutions,
        resolveQuestion,
        unresolveQuestion,
        updateResolutionText,
        screenshots,
        addScreenshot,
        removeScreenshot,
        updateScreenshotCaption,
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
