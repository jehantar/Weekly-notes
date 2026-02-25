"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import { AddTaskInline } from "./add-task-inline";
import type { Task, TaskStatus } from "@/lib/types/database";
import { TASK_STATUS_LABELS, STATUS_DOT_COLORS } from "@/lib/constants";
import { useTasks } from "@/components/providers/tasks-provider";

export function KanbanColumn({
  status,
  tasks,
  isOver,
  focusedTaskId,
  isCollapsed,
  onToggleCollapse,
  onSelectTask,
}: {
  status: TaskStatus;
  tasks: Task[];
  isOver: boolean;
  focusedTaskId?: string | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onSelectTask?: (taskId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const { clearCompleted } = useTasks();

  const { setNodeRef } = useDroppable({ id: status });

  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sortedTasks.map((t) => t.id);
  const dotColor = STATUS_DOT_COLORS[status];

  // Collapsed view
  if (isCollapsed) {
    return (
      <div
        ref={setNodeRef}
        onClick={onToggleCollapse}
        className="flex flex-col items-center cursor-pointer select-none"
        style={{
          width: '36px',
          minWidth: '36px',
          backgroundColor: isOver
            ? 'color-mix(in srgb, var(--accent-purple) 6%, var(--bg-column))'
            : 'var(--bg-column)',
          boxShadow: isOver
            ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent-purple) 30%, transparent)'
            : 'none',
          transition: 'background-color 100ms ease-out, box-shadow 100ms ease-out',
        }}
      >
        <div className="pt-3 pb-2">
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {tasks.length}
          </span>
        </div>
        <div
          className="text-[11px] font-medium uppercase tracking-widest"
          style={{
            color: 'var(--text-placeholder)',
            writingMode: 'vertical-rl',
          }}
        >
          {TASK_STATUS_LABELS[status]}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      ref={setNodeRef}
      className="group/col flex flex-col min-w-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: isOver
          ? 'color-mix(in srgb, var(--accent-purple) 6%, var(--bg-column))'
          : 'var(--bg-column)',
        boxShadow: isOver
          ? 'inset 0 0 0 1px color-mix(in srgb, var(--accent-purple) 30%, transparent)'
          : 'none',
        transition: 'background-color 100ms ease-out, box-shadow 100ms ease-out',
      }}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: dotColor }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {TASK_STATUS_LABELS[status]}
          </span>
          <span
            className="text-[11px]"
            style={{ color: 'var(--text-placeholder)' }}
          >
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === "done" && tasks.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-[10px] transition-colors hover:underline"
              style={{ color: 'var(--text-placeholder)' }}
            >
              Clear
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="text-[11px] transition-opacity opacity-0 group-hover/col:opacity-100"
              style={{ color: 'var(--text-placeholder)' }}
              title="Collapse column"
            >
              &laquo;
            </button>
          )}
        </div>
      </div>

      {/* Cards list */}
      <div
        className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-px"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isFocused={focusedTaskId === task.id}
              onSelectTask={onSelectTask}
            />
          ))}
        </SortableContext>

        {sortedTasks.length === 0 && !adding && (
          <div
            className="py-6 mx-1 flex items-center justify-center text-[11px]"
            style={{
              color: 'var(--text-placeholder)',
              border: '1px dashed var(--border-card)',
            }}
          >
            No tasks
          </div>
        )}

        {adding && (
          <AddTaskInline status={status} onDone={() => setAdding(false)} />
        )}
      </div>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full px-3 py-2 text-xs text-left transition-opacity"
          style={{ color: 'var(--text-placeholder)' }}
          {...(status === "backlog" ? { "data-add-backlog": true } : {})}
        >
          <span className="opacity-0 group-hover/col:opacity-100 transition-opacity">
            + Add task
          </span>
        </button>
      )}
    </div>
  );
}
