"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { useTasks } from "@/components/providers/tasks-provider";
import { TASK_STATUSES, PRIORITY_DOT_COLORS, safePriority, taskSortCompare } from "@/lib/constants";
import { TaskDetailPanel } from "./task-detail-panel";
import type { Task, TaskStatus } from "@/lib/types/database";

function DragOverlayCard({ task }: { task: Task }) {
  const priority = safePriority(task.priority);
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 cursor-grabbing"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--accent-purple)',
        boxShadow: 'var(--shadow-card-drag)',
        transform: 'scale(1.02) rotate(-0.5deg)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
          {task.content}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {task.meeting_title && (
          <span
            className="text-[10px] px-1 py-0.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent-purple) 12%, transparent)',
              color: 'var(--accent-purple)',
            }}
          >
            #{task.meeting_title}
          </span>
        )}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT_COLORS[priority] }}
        />
      </div>
    </div>
  );
}

const dropAnimationConfig = {
  duration: 200,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
};

export function KanbanBoard() {
  const { tasks, moveTask, reorderTasks, updateTask, deleteTask } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getColumnTasks = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks]
  );

  const allTaskIds = useMemo(() => {
    const ids: string[] = [];
    for (const status of TASK_STATUSES) {
      const columnTasks = tasks
        .filter((t) => t.status === status)
        .sort(taskSortCompare);
      ids.push(...columnTasks.map((t) => t.id));
    }
    return ids;
  }, [tasks]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput) return;

      if (e.key === "Tab") {
        if (allTaskIds.length === 0) return;

        if (!focusedTaskId) {
          // Bootstrap: first Tab press focuses the first task
          e.preventDefault();
          setFocusedTaskId(allTaskIds[0]);
          return;
        }

        e.preventDefault();
        const currentIndex = allTaskIds.indexOf(focusedTaskId);
        if (e.shiftKey) {
          const prevIndex = currentIndex <= 0 ? allTaskIds.length - 1 : currentIndex - 1;
          setFocusedTaskId(allTaskIds[prevIndex]);
        } else {
          const nextIndex = currentIndex >= allTaskIds.length - 1 ? 0 : currentIndex + 1;
          setFocusedTaskId(allTaskIds[nextIndex]);
        }
        return;
      }

      if (e.key === "Escape") {
        if (selectedTaskId) {
          setSelectedTaskId(null);
        } else {
          setFocusedTaskId(null);
        }
        return;
      }

      if (!focusedTaskId) return;
      const task = tasks.find((t) => t.id === focusedTaskId);
      if (!task) return;

      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        const priority = parseInt(e.key) - 1;
        updateTask(task.id, { priority });
        return;
      }

      if (e.key === "Delete") {
        e.preventDefault();
        const currentIndex = allTaskIds.indexOf(focusedTaskId);
        deleteTask(task.id);
        const remaining = allTaskIds.filter((id) => id !== focusedTaskId);
        if (remaining.length > 0) {
          const nextIndex = Math.min(currentIndex, remaining.length - 1);
          setFocusedTaskId(remaining[nextIndex]);
        } else {
          setFocusedTaskId(null);
        }
        return;
      }

      if (e.key === "d") {
        e.preventDefault();
        if (task.status !== "done") {
          moveTask(task.id, "done", 0);
        }
        return;
      }

      if (e.key === "n") {
        e.preventDefault();
        setFocusedTaskId(null);
        const backlogAddBtn = document.querySelector<HTMLButtonElement>('[data-add-backlog]');
        backlogAddBtn?.click();
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        setSelectedTaskId(task.id);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const cardEl = document.querySelector(`[data-task-id="${focusedTaskId}"]`);
        const textEl = cardEl?.querySelector<HTMLElement>('[data-task-text]');
        textEl?.click();
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [allTaskIds, focusedTaskId, selectedTaskId, tasks, updateTask, deleteTask, moveTask]);

  const findColumn = useCallback(
    (id: string): TaskStatus | null => {
      if (TASK_STATUSES.includes(id as TaskStatus)) return id as TaskStatus;
      const task = tasks.find((t) => t.id === id);
      return (task?.status as TaskStatus) ?? null;
    },
    [tasks]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
      setFocusedTaskId(null);
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverColumn(null);
        return;
      }
      const column = findColumn(over.id as string);
      setOverColumn(column);
    },
    [findColumn]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumn(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const sourceColumn = findColumn(activeId);
      const destColumn = findColumn(overId);

      if (!sourceColumn || !destColumn) return;

      if (sourceColumn === destColumn) {
        const columnTasks = [...getColumnTasks(sourceColumn)].sort(
          (a, b) => a.sort_order - b.sort_order
        );
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId);
        const newIndex = columnTasks.findIndex((t) => t.id === overId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        const reordered = [...columnTasks];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        reorderTasks(sourceColumn, reordered.map((t) => t.id));
      } else {
        const destTasks = [...getColumnTasks(destColumn)].sort(
          (a, b) => a.sort_order - b.sort_order
        );

        let newIndex = destTasks.length;
        const overTaskIndex = destTasks.findIndex((t) => t.id === overId);
        if (overTaskIndex !== -1) {
          newIndex = overTaskIndex;
        }

        await moveTask(activeId, destColumn, newIndex);

        const newDestOrder = [...destTasks];
        newDestOrder.splice(newIndex, 0, { id: activeId } as Task);
        await reorderTasks(destColumn, newDestOrder.map((t) => t.id));

        const sourceTasks = getColumnTasks(sourceColumn)
          .filter((t) => t.id !== activeId)
          .sort(taskSortCompare);
        if (sourceTasks.length > 0) {
          await reorderTasks(sourceColumn, sourceTasks.map((t) => t.id));
        }
      }
    },
    [findColumn, getColumnTasks, moveTask, reorderTasks]
  );

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-0.5 h-full">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getColumnTasks(status)}
              isOver={overColumn === status}
              focusedTaskId={focusedTaskId}
              onSelectTask={setSelectedTaskId}
              {...(status === "done" ? {
                isCollapsed: doneCollapsed,
                onToggleCollapse: () => setDoneCollapsed((c) => !c),
              } : {})}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={dropAnimationConfig}>
          {activeTask ? <DragOverlayCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </>
  );
}
