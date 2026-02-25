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
}: {
  status: TaskStatus;
  tasks: Task[];
  isOver: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const { clearCompleted } = useTasks();

  const { setNodeRef } = useDroppable({ id: status });

  const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order);
  const taskIds = sortedTasks.map((t) => t.id);

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col min-w-0 flex-1 overflow-hidden"
      style={{
        backgroundColor: isOver
          ? 'color-mix(in srgb, var(--accent-purple) 5%, var(--bg-card))'
          : 'var(--bg-card)',
        border: isOver
          ? '1px dashed var(--accent-purple)'
          : '1px solid var(--border-card)',
        transition: 'background-color 150ms, border-color 150ms',
      }}
    >
      {/* Column header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border-card)' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--text-placeholder)' }}
          >
            {TASK_STATUS_LABELS[status]}
          </span>
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-placeholder)' }}
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
      <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: 'calc(75vh - 40px)' }}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <KanbanCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {adding && (
          <AddTaskInline status={status} onDone={() => setAdding(false)} />
        )}
      </div>

      {/* Add button */}
      {!adding && (
        <button
          onClick={() => setAdding(true)}
          className="w-full px-3 py-1.5 text-xs text-left transition-colors group/add"
          style={{
            borderTop: '1px solid var(--border-card)',
            color: 'var(--text-placeholder)',
          }}
        >
          <span className="opacity-0 group-hover/add:opacity-100 transition-opacity">
            + Add task
          </span>
        </button>
      )}
    </div>
  );
}
