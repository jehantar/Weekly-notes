"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks } from "@/components/providers/tasks-provider";
import { MeetingTagInput } from "./meeting-tag-input";
import type { Task } from "@/lib/types/database";
import { PRIORITY_LABELS, PRIORITY_DOT_COLORS, safePriority } from "@/lib/constants";

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function KanbanCard({
  task,
  isFocused,
  onSelectTask,
}: {
  task: Task;
  isFocused?: boolean;
  onSelectTask?: (taskId: string) => void;
}) {
  const { updateTask, deleteTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);

  const priority = safePriority(task.priority);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, animateLayoutChanges });

  const isDone = task.status === "done";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, 'background-color 100ms ease-out, opacity 100ms ease-out'].filter(Boolean).join(', '),
    ...(isDragging
      ? {
          opacity: 0.3,
          backgroundColor: 'var(--bg-column)',
          border: '1px dashed var(--border-card)',
        }
      : {
          opacity: 1,
          borderBottom: '1px solid var(--border-card)',
        }),
    ...(isFocused && !isDragging && {
      outline: '1px solid var(--accent-purple)',
      outlineOffset: '-1px',
    }),
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setEditContent(task.content);
    }
  }, [task.content, editing]);

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
    const next = ((task.priority + 1) % 3);
    updateTask(task.id, { priority: next });
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open detail panel if clicking the card body (not text, dot, or delete)
    if (onSelectTask) {
      onSelectTask(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-hover)]"
      data-task-id={task.id}
      onClick={handleCardClick}
      {...attributes}
      {...listeners}
    >
      {/* Content — takes available space */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            className="w-full text-xs bg-transparent outline-none pb-0.5"
            style={{
              color: 'var(--text-primary)',
              borderBottom: '1px solid var(--accent-purple)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-xs truncate cursor-text"
            data-task-text
            style={{
              color: isDone ? 'var(--text-placeholder)' : 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {task.content}
          </div>
        )}
      </div>

      {/* Right-aligned metadata: meeting tag, priority dot, delete */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Meeting tag — inline compact */}
        <MeetingTagInput task={task} />

        {/* Priority dot */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            cyclePriority();
          }}
          className="shrink-0"
          title={PRIORITY_LABELS[priority]}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: PRIORITY_DOT_COLORS[priority] }}
          />
        </button>

        {/* Delete button (hover reveal) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteTask(task.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="shrink-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
          style={{ color: 'var(--text-placeholder)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
          title="Delete task"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
