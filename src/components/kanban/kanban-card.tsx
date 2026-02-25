"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks } from "@/components/providers/tasks-provider";
import type { Task } from "@/lib/types/database";
import { PRIORITY_LABELS } from "@/lib/constants";

const PRIORITY_DOT_COLORS = [
  "var(--text-placeholder)", // 0 = low (gray)
  "#d97706",                  // 1 = medium (amber)
  "#dc2626",                  // 2 = high (red)
];

export function KanbanCard({ task }: { task: Task }) {
  const { updateTask, deleteTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== task.content) {
      updateTask(task.id, { content: trimmed });
    } else {
      setEditContent(task.content);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === "Escape") {
      setEditContent(task.content);
      setEditing(false);
    }
  };

  const cyclePriority = () => {
    const next = (task.priority + 1) % 3;
    updateTask(task.id, { priority: next });
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
      }}
      className="group flex items-start gap-2 p-2 cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      {/* Priority dot */}
      <button
        onClick={cyclePriority}
        className="shrink-0 mt-0.5"
        title={PRIORITY_LABELS[task.priority]}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT_COLORS[task.priority] }}
        />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            className="w-full text-xs bg-transparent outline-none"
            style={{ color: 'var(--text-primary)' }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-xs cursor-text"
            style={{ color: 'var(--text-primary)' }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.content}
          </div>
        )}

        {/* Meeting tag */}
        {task.meeting_title && (
          <div className="mt-1">
            <span
              className="inline-block text-[10px] px-1.5 py-0.5"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)',
                color: 'var(--accent-purple)',
              }}
            >
              #{task.meeting_title}
            </span>
          </div>
        )}
      </div>

      {/* Delete button (hover reveal) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteTask(task.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
        style={{ color: 'var(--text-placeholder)' }}
        title="Delete task"
      >
        &times;
      </button>
    </div>
  );
}
