"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks } from "@/components/providers/tasks-provider";
import { MeetingTagInput } from "./meeting-tag-input";
import type { Task } from "@/lib/types/database";
import { PRIORITY_LABELS, PRIORITY_DOT_COLORS, PRIORITY_STRIPE_COLORS, safePriority } from "@/lib/constants";

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function KanbanCard({
  task,
  isFocused,
}: {
  task: Task;
  isFocused?: boolean;
}) {
  const { updateTask, deleteTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const [isHovered, setIsHovered] = useState(false);
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: [transition, 'box-shadow 150ms', 'border-color 150ms', 'opacity 150ms'].filter(Boolean).join(', '),
    ...(isDragging
      ? {
          opacity: 0.3,
          backgroundColor: 'var(--bg-column)',
          border: '1px dashed var(--border-card)',
          boxShadow: 'none',
        }
      : {
          opacity: 1,
          backgroundColor: 'var(--bg-card)',
          borderLeft: `3px solid ${PRIORITY_STRIPE_COLORS[priority]}`,
          borderTop: '1px solid var(--border-card)',
          borderRight: '1px solid var(--border-card)',
          borderBottom: '1px solid var(--border-card)',
          boxShadow: isHovered
            ? 'var(--shadow-card-hover)'
            : 'var(--shadow-card)',
        }),
    ...(isFocused && !isDragging && {
      outline: '2px solid var(--accent-purple)',
      outlineOffset: '-2px',
    }),
    ...(isHovered && !isDragging && {
      borderColor: 'var(--accent-purple)',
      borderLeft: `3px solid ${priority > 0 ? PRIORITY_STRIPE_COLORS[priority] : 'var(--accent-purple)'}`,
    }),
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // Sync editContent when task content changes externally
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-start gap-2 p-2.5 cursor-grab active:cursor-grabbing"
      data-task-id={task.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...attributes}
      {...listeners}
    >
      {/* Priority dot */}
      <button
        onClick={cyclePriority}
        className="shrink-0 mt-0.5"
        title={PRIORITY_LABELS[priority]}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: PRIORITY_DOT_COLORS[priority] }}
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
            className="w-full text-xs bg-transparent outline-none pb-0.5"
            style={{
              color: 'var(--text-primary)',
              borderBottom: '2px solid var(--accent-purple)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className="text-xs cursor-text"
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

        {/* Meeting tag */}
        <MeetingTagInput task={task} />
      </div>

      {/* Delete button (hover reveal) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteTask(task.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="shrink-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs leading-none"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
        title="Delete task"
      >
        &times;
      </button>
    </div>
  );
}
