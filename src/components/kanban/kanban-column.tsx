"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import { AddTaskInline } from "./add-task-inline";
import type { Task, TaskStatus } from "@/lib/types/database";
import { TASK_STATUS_LABELS } from "@/lib/constants";
import { useTasks } from "@/components/providers/tasks-provider";

export function KanbanColumn({
  status,
  tasks,
  isOver,
  focusedTaskId,
}: {
  status: TaskStatus;
  tasks: Task[];
  isOver: boolean;
  focusedTaskId?: string | null;
}) {
  const [adding, setAdding] = useState(false);
  const { clearCompleted } = useTasks();

  const { setNodeRef } = useDroppable({ id: status });

  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sortedTasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className="group/col flex flex-col min-w-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: isOver
          ? 'color-mix(in srgb, var(--accent-purple) 8%, var(--bg-column))'
          : 'var(--bg-column)',
        boxShadow: isOver
          ? 'inset 0 0 0 2px color-mix(in srgb, var(--accent-purple) 30%, transparent)'
          : 'none',
        transition: 'background-color 150ms, box-shadow 150ms',
      }}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: 'var(--text-secondary)' }}
          >
            {TASK_STATUS_LABELS[status]}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--text-secondary) 10%, transparent)',
            }}
          >
            {tasks.length}
          </span>
        </div>
        {status === "done" && tasks.length > 0 && (
          <button
            onClick={clearCompleted}
            className="text-[10px] transition-colors hover:underline"
            style={{ color: 'var(--text-placeholder)' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Cards list */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              isFocused={focusedTaskId === task.id}
            />
          ))}
        </SortableContext>

        {sortedTasks.length === 0 && !adding && (
          <div
            className="py-8 text-center text-[11px]"
            style={{ color: 'var(--text-placeholder)' }}
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
