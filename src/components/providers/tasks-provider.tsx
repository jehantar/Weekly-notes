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
import type { Task, TaskStatus, Subtask, Tag } from "@/lib/types/database";
import { UNDO_TIMEOUT } from "@/lib/constants";
import { toast } from "sonner";

type TasksContextType = {
  tasks: Task[];
  subtasks: Record<string, Subtask[]>;
  addTask: (content: string, status?: TaskStatus) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus, newSortOrder: number) => Promise<void>;
  reorderTasks: (status: TaskStatus, orderedIds: string[]) => Promise<void>;
  linkMeeting: (taskId: string, meetingId: string | null, title: string | null, weekStart: string | null) => Promise<void>;
  clearCompleted: () => Promise<void>;
  bulkMoveTasks: (ids: string[], status: TaskStatus) => Promise<void>;
  bulkDeleteTasks: (ids: string[]) => void;
  bulkAddTag: (ids: string[], tagId: string) => Promise<void>;
  addSubtask: (taskId: string, content: string) => Promise<Subtask | null>;
  updateSubtask: (id: string, taskId: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (id: string, taskId: string) => Promise<void>;
  toggleSubtask: (id: string, taskId: string) => Promise<void>;
  reorderSubtasks: (taskId: string, orderedIds: string[]) => Promise<void>;
  fetchSubtasks: (taskId: string) => Promise<void>;
  tags: Tag[];
  taskTags: Record<string, string[]>; // taskId -> tagId[]
  createTag: (name: string, color: string) => Promise<Tag | null>;
  deleteTag: (id: string) => Promise<void>;
  addTagToTask: (taskId: string, tagId: string) => Promise<void>;
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({
  children,
  initialTasks,
  initialTags = [],
  initialTaskTags = {},
}: {
  children: ReactNode;
  initialTasks: Task[];
  initialTags?: Tag[];
  initialTaskTags?: Record<string, string[]>;
}) {
  const supabase = useSupabase();
  const [tasks, setTasks] = useState(initialTasks);
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [taskTags, setTaskTags] = useState<Record<string, string[]>>(initialTaskTags);

  // Ref to avoid stale closures — always has latest tasks
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  const subtasksRef = useRef(subtasks);
  useEffect(() => { subtasksRef.current = subtasks; }, [subtasks]);

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

  const fetchSubtasks = useCallback(
    async (taskId: string) => {
      const { data } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId)
        .order("sort_order");
      if (data) {
        setSubtasks((prev) => ({ ...prev, [taskId]: data as Subtask[] }));
      }
    },
    [supabase]
  );

  const addSubtask = useCallback(
    async (taskId: string, content: string): Promise<Subtask | null> => {
      const existing = subtasksRef.current[taskId] ?? [];
      const maxOrder = existing.reduce((max, s) => Math.max(max, s.sort_order), -1);

      const { data, error } = await supabase
        .from("subtasks")
        .insert({ task_id: taskId, content, sort_order: maxOrder + 1 })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to add subtask");
        return null;
      }
      const subtask = data as Subtask;
      setSubtasks((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] ?? []), subtask],
      }));
      return subtask;
    },
    [supabase]
  );

  const updateSubtask = useCallback(
    async (id: string, taskId: string, updates: Partial<Subtask>) => {
      setSubtasks((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? []).map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }));

      const { error } = await supabase.from("subtasks").update(updates).eq("id", id);
      if (error) toast.error("Failed to update subtask");
    },
    [supabase]
  );

  const deleteSubtask = useCallback(
    async (id: string, taskId: string) => {
      const snapshot = subtasksRef.current[taskId] ?? [];
      setSubtasks((prev) => ({
        ...prev,
        [taskId]: (prev[taskId] ?? []).filter((s) => s.id !== id),
      }));

      const { error } = await supabase.from("subtasks").delete().eq("id", id);
      if (error) {
        setSubtasks((prev) => ({ ...prev, [taskId]: snapshot }));
        toast.error("Failed to delete subtask");
      }
    },
    [supabase]
  );

  const toggleSubtask = useCallback(
    async (id: string, taskId: string) => {
      const list = subtasksRef.current[taskId] ?? [];
      const item = list.find((s) => s.id === id);
      if (!item) return;
      await updateSubtask(id, taskId, { completed: !item.completed });
    },
    [updateSubtask]
  );

  const reorderSubtasks = useCallback(
    async (taskId: string, orderedIds: string[]) => {
      const snapshot = subtasksRef.current[taskId] ?? [];
      setSubtasks((prev) => {
        const list = prev[taskId] ?? [];
        const reordered = orderedIds.map((id, idx) => {
          const s = list.find((x) => x.id === id);
          return s ? { ...s, sort_order: idx } : s;
        }).filter(Boolean) as Subtask[];
        return { ...prev, [taskId]: reordered };
      });

      const updates = orderedIds.map((id, idx) =>
        supabase.from("subtasks").update({ sort_order: idx }).eq("id", id)
      );
      const results = await Promise.all(updates);
      if (results.some((r) => r.error)) {
        setSubtasks((prev) => ({ ...prev, [taskId]: snapshot }));
        toast.error("Failed to reorder subtasks");
      }
    },
    [supabase]
  );

  const bulkMoveTasks = useCallback(
    async (ids: string[], status: TaskStatus) => {
      const snapshot = tasksRef.current;
      const completedAt = status === "done" ? new Date().toISOString() : null;

      setTasks((prev) =>
        prev.map((t) =>
          ids.includes(t.id) ? { ...t, status, completed_at: completedAt } : t
        )
      );

      const { error } = await supabase
        .from("tasks")
        .update({ status, completed_at: completedAt })
        .in("id", ids);

      if (error) {
        setTasks(snapshot);
        toast.error("Failed to move tasks");
      }
    },
    [supabase]
  );

  const bulkDeleteTasks = useCallback(
    (ids: string[]) => {
      const items = tasksRef.current.filter((t) => ids.includes(t.id));
      if (items.length === 0) return;

      setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));

      const timeout = setTimeout(async () => {
        const { error } = await supabase.from("tasks").delete().in("id", ids);
        if (error) {
          setTasks((prev) => [...prev, ...items]);
          toast.error("Failed to delete tasks");
        }
      }, UNDO_TIMEOUT);

      toast(`${items.length} task${items.length > 1 ? "s" : ""} deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setTasks((prev) => [...prev, ...items]);
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    [supabase]
  );

  const bulkAddTag = useCallback(
    async (ids: string[], tagId: string) => {
      // Only add to tasks that don't already have this tag
      const toAdd = ids.filter((id) => !(taskTags[id] ?? []).includes(tagId));
      if (toAdd.length === 0) return;

      const snapshot = { ...taskTags };
      setTaskTags((prev) => {
        const next = { ...prev };
        for (const id of toAdd) {
          next[id] = [...(next[id] ?? []), tagId];
        }
        return next;
      });

      const { error } = await supabase
        .from("task_tags")
        .insert(toAdd.map((taskId) => ({ task_id: taskId, tag_id: tagId })));

      if (error) {
        setTaskTags(snapshot);
        toast.error("Failed to tag tasks");
      }
    },
    [supabase, taskTags]
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

  const createTag = useCallback(
    async (name: string, color: string): Promise<Tag | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: user.id, name, color })
        .select()
        .single();

      if (error || !data) {
        toast.error("Failed to create tag");
        return null;
      }
      const tag = data as Tag;
      setTags((prev) => [...prev, tag]);
      return tag;
    },
    [supabase]
  );

  const deleteTag = useCallback(
    async (id: string) => {
      const tagsSnapshot = tags;
      const taskTagsSnapshot = { ...taskTags };
      setTags((prev) => prev.filter((t) => t.id !== id));
      setTaskTags((prev) => {
        const next = { ...prev };
        for (const taskId in next) {
          next[taskId] = next[taskId].filter((tid) => tid !== id);
        }
        return next;
      });

      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) {
        setTags(tagsSnapshot);
        setTaskTags(taskTagsSnapshot);
        toast.error("Failed to delete tag");
      }
    },
    [supabase, tags, taskTags]
  );

  const addTagToTask = useCallback(
    async (taskId: string, tagId: string) => {
      setTaskTags((prev) => ({
        ...prev,
        [taskId]: [...(prev[taskId] ?? []), tagId],
      }));

      const { error } = await supabase
        .from("task_tags")
        .insert({ task_id: taskId, tag_id: tagId });

      if (error) {
        setTaskTags((prev) => ({
          ...prev,
          [taskId]: (prev[taskId] ?? []).filter((id) => id !== tagId),
        }));
        toast.error("Failed to add tag");
      }
    },
    [supabase]
  );

  const removeTagFromTask = useCallback(
    async (taskId: string, tagId: string) => {
      const prev = taskTags[taskId] ?? [];
      setTaskTags((s) => ({
        ...s,
        [taskId]: (s[taskId] ?? []).filter((id) => id !== tagId),
      }));

      const { error } = await supabase
        .from("task_tags")
        .delete()
        .eq("task_id", taskId)
        .eq("tag_id", tagId);

      if (error) {
        setTaskTags((s) => ({ ...s, [taskId]: prev }));
        toast.error("Failed to remove tag");
      }
    },
    [supabase, taskTags]
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        subtasks,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        reorderTasks,
        linkMeeting,
        clearCompleted,
        bulkMoveTasks,
        bulkDeleteTasks,
        bulkAddTag,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        toggleSubtask,
        reorderSubtasks,
        fetchSubtasks,
        tags,
        taskTags,
        createTag,
        deleteTag,
        addTagToTask,
        removeTagFromTask,
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
