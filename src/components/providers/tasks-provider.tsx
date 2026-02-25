"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import { useSupabase } from "./supabase-provider";
import type { Task, TaskStatus } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

type TasksContextType = {
  tasks: Task[];
  addTask: (content: string, status?: TaskStatus) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newSortOrder: number) => Promise<void>;
  reorderTasks: (status: TaskStatus, orderedIds: string[]) => Promise<void>;
  linkMeeting: (taskId: string, meetingId: string | null, title: string | null, weekStart: string | null) => Promise<void>;
  clearCompleted: () => Promise<void>;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({
  children,
  initialTasks,
}: {
  children: ReactNode;
  initialTasks: Task[];
}) {
  const supabase = useSupabase();
  const [tasks, setTasks] = useState(initialTasks);

  // Ref to avoid stale closures — always has latest tasks
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const addTask = useCallback(
    async (content: string, status: TaskStatus = "backlog"): Promise<Task | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const currentTasks = tasksRef.current;
      const columnTasks = currentTasks.filter((t) => t.status === status);
      const maxOrder = columnTasks.reduce((max, t) => Math.max(max, t.sort_order), -1);

      const { data, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          content,
          status,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to create task");
        return null;
      }
      setTasks((prev) => [...prev, data as Task]);
      return data as Task;
    },
    [supabase]
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      setTasks((items) =>
        items.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) {
        if (prev) {
          setTasks((items) => items.map((t) => (t.id === id ? prev : t)));
        }
        toast.error("Failed to update task");
      }
    },
    [supabase]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const item = tasksRef.current.find((t) => t.id === id);
      if (!item) return;

      setTasks((prev) => prev.filter((t) => t.id !== id));

      const timeout = setTimeout(async () => {
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) {
          setTasks((prev) => [...prev, item]);
          toast.error("Failed to delete task");
        }
      }, UNDO_TIMEOUT);

      toast("Task deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setTasks((prev) => [...prev, item]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [supabase]
  );

  const moveTask = useCallback(
    async (id: string, newStatus: TaskStatus, newSortOrder: number) => {
      const prev = tasksRef.current.find((t) => t.id === id);
      if (!prev) return;

      const completedAt = newStatus === "done" ? new Date().toISOString() : null;

      setTasks((items) =>
        items.map((t) =>
          t.id === id
            ? { ...t, status: newStatus, sort_order: newSortOrder, completed_at: completedAt }
            : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, sort_order: newSortOrder, completed_at: completedAt })
        .eq("id", id);

      if (error) {
        setTasks((items) => items.map((t) => (t.id === id ? prev : t)));
        toast.error("Failed to move task");
      }
    },
    [supabase]
  );

  const reorderTasks = useCallback(
    async (status: TaskStatus, orderedIds: string[]) => {
      // Snapshot for rollback
      const snapshot = tasksRef.current;

      // Optimistic: update sort_order locally
      setTasks((prev) =>
        prev.map((t) => {
          const idx = orderedIds.indexOf(t.id);
          if (idx !== -1) return { ...t, sort_order: idx };
          return t;
        })
      );

      // Batch update via individual calls (small columns, typically <50)
      const updates = orderedIds.map((id, idx) =>
        supabase.from("tasks").update({ sort_order: idx }).eq("id", id)
      );

      const results = await Promise.all(updates);
      const failed = results.some((r) => r.error);
      if (failed) {
        setTasks(snapshot);
        toast.error("Failed to reorder tasks");
      }
    },
    [supabase]
  );

  const linkMeeting = useCallback(
    async (taskId: string, meetingId: string | null, title: string | null, weekStart: string | null) => {
      const prev = tasksRef.current.find((t) => t.id === taskId);
      setTasks((items) =>
        items.map((t) =>
          t.id === taskId
            ? { ...t, meeting_id: meetingId, meeting_title: title, meeting_week_start: weekStart }
            : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ meeting_id: meetingId, meeting_title: title, meeting_week_start: weekStart })
        .eq("id", taskId);

      if (error) {
        if (prev) {
          setTasks((items) => items.map((t) => (t.id === taskId ? prev : t)));
        }
        toast.error("Failed to link meeting");
      }
    },
    [supabase]
  );

  const clearCompleted = useCallback(async () => {
    const currentTasks = tasksRef.current;
    const completedTasks = currentTasks.filter((t) => t.status === "done");
    if (completedTasks.length === 0) return;

    const completedIds = completedTasks.map((t) => t.id);
    setTasks((prev) => prev.filter((t) => t.status !== "done"));

    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", completedIds);

    if (error) {
      setTasks((prev) => [...prev, ...completedTasks]);
      toast.error("Failed to clear completed tasks");
    }
  }, [supabase]);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        linkMeeting,
        clearCompleted,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error("useTasks must be used within a TasksProvider");
  }
  return context;
}
