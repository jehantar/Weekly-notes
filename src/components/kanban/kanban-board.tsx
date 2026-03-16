"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
import { TagFilterBar } from "./tag-filter-bar";
import { BulkActionsBar } from "./bulk-actions-bar";
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
  const { tasks, taskTags, moveTask, reorderTasks } = useTasks();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedRef = useRef<string | null>(null);
  const [tagFilters, setTagFilters] = useState<Set<string>>(new Set());
  const [shortcutsDismissed, setShortcutsDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("shortcuts-dismissed") === "true";
  });

  const toggleTagFilter = useCallback((tagId: string) => {
    setTagFilters((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  }, []);

  const clearTagFilters = useCallback(() => setTagFilters(new Set()), []);

  const handleToggleSelect = useCallback(
    (taskId: string, shiftKey: boolean) => {
      setBulkSelectedIds((prev) => {
        const next = new Set(prev);
        const lastClickedId = lastClickedRef.current;
        if (shiftKey && lastClickedId) {
          // Range select within same column
          const task = tasks.find((t) => t.id === taskId);
          const lastTask = tasks.find((t) => t.id === lastClickedId);
          if (task && lastTask && task.status === lastTask.status) {
            const columnTasks = tasks
              .filter((t) => t.status === task.status)
              .sort(taskSortCompare);
            const startIdx = columnTasks.findIndex((t) => t.id === lastClickedId);
            const endIdx = columnTasks.findIndex((t) => t.id === taskId);
            const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            for (let i = lo; i <= hi; i++) {
              next.add(columnTasks[i].id);
            }
          } else {
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
          }
        } else {
          if (next.has(taskId)) next.delete(taskId);
          else next.add(taskId);
        }
        return next;
      });
      lastClickedRef.current = taskId;
    },
    [tasks]
  );

  const clearBulkSelection = useCallback(() => {
    setBulkSelectedIds(new Set());
    lastClickedRef.current = null;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const getColumnTasks = useCallback(
    (status: TaskStatus) => {
      let filtered = tasks.filter((t) => t.status === status);
      if (tagFilters.size > 0) {
        filtered = filtered.filter((t) => {
          const tTags = taskTags[t.id] ?? [];
          return tTags.some((id) => tagFilters.has(id));
        });
      }
      return filtered;
    },
    [tasks, tagFilters, taskTags]
  );

  // Keyboard shortcuts (minimal set to avoid interfering with typing)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (isInput) return;

      if (e.key === "Escape") {
        if (bulkSelectedIds.size > 0) {
          clearBulkSelection();
        } else if (selectedTaskId) {
          setSelectedTaskId(null);
        } else {
          setFocusedTaskId(null);
        }
        return;
      }

      if (!focusedTaskId) return;

      if (e.key === "Enter") {
        e.preventDefault();
        setSelectedTaskId(focusedTaskId);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [focusedTaskId, selectedTaskId, bulkSelectedIds, clearBulkSelection]);

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

  const dismissShortcuts = () => {
    setShortcutsDismissed(true);
    localStorage.setItem("shortcuts-dismissed", "true");
  };

  return (
    <>
      <TagFilterBar
        activeFilters={tagFilters}
        onToggleFilter={toggleTagFilter}
        onClearFilters={clearTagFilters}
      />
      {!shortcutsDismissed && (
        <div
          className="flex items-center justify-between px-3 py-1.5 text-[11px]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-purple) 8%, var(--bg-column))',
            borderBottom: '1px solid var(--border-card)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>
            <kbd className="px-1 py-0.5 mx-0.5" style={{ border: '1px solid var(--border-card)', color: 'var(--text-placeholder)' }}>Esc</kbd> close
            <span className="mx-1.5" style={{ color: 'var(--border-card)' }}>|</span>
            <kbd className="px-1 py-0.5 mx-0.5" style={{ border: '1px solid var(--border-card)', color: 'var(--text-placeholder)' }}>Enter</kbd> open task
          </span>
          <button
            onClick={dismissShortcuts}
            className="text-[10px] transition-colors"
            style={{ color: 'var(--text-placeholder)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
          >
            Dismiss
          </button>
        </div>
      )}
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
              onSelectTask={bulkSelectedIds.size > 0 ? undefined : setSelectedTaskId}
              selectedTaskIds={bulkSelectedIds}
              onToggleSelect={handleToggleSelect}
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

      {bulkSelectedIds.size > 0 && (
        <BulkActionsBar
          selectedIds={bulkSelectedIds}
          onClearSelection={clearBulkSelection}
        />
      )}
    </>
  );
}
