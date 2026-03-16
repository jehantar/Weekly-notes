"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTasks } from "@/components/providers/tasks-provider";
import { MeetingTagInput } from "./meeting-tag-input";
import { HoverPreview } from "./hover-preview";
import type { Task } from "@/lib/types/database";
import { PRIORITY_LABELS, PRIORITY_DOT_COLORS, safePriority, TAG_COLORS } from "@/lib/constants";

function TagPills({ taskId }: { taskId: string }) {
  const { tags, taskTags } = useTasks();
  const assignedIds = taskTags[taskId] ?? [];
  if (assignedIds.length === 0) return null;

  const maxShow = 2;
  const visible = assignedIds.slice(0, maxShow);
  const overflow = assignedIds.length - maxShow;

  return (
    <>
      {visible.map((tagId) => {
        const tag = tags.find((t) => t.id === tagId);
        if (!tag) return null;
        const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
        return (
          <span
            key={tag.id}
            className="text-[10px] px-1 py-0.5"
            style={{ backgroundColor: color.bg, color: color.text }}
          >
            {tag.name}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px]" style={{ color: 'var(--text-placeholder)' }}>
          +{overflow}
        </span>
      )}
    </>
  );
}

function SubtaskPill({ taskId }: { taskId: string }) {
  const { subtasks } = useTasks();
  const list = subtasks[taskId];
  if (!list || list.length === 0) return null;
  const done = list.filter((s) => s.completed).length;
  return (
    <span
      className="text-[10px] px-1 py-0.5 tabular-nums"
      style={{
        backgroundColor: done === list.length
          ? 'color-mix(in srgb, #8baa8b 20%, transparent)'
          : 'color-mix(in srgb, var(--accent-purple) 12%, transparent)',
        color: done === list.length ? '#8baa8b' : 'var(--accent-purple)',
      }}
    >
      {done}/{list.length}
    </span>
  );
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function KanbanCard({
  task,
  isSelected,
  selectionActive,
  onSelectTask,
  onToggleSelect,
}: {
  task: Task;
  isSelected?: boolean;
  selectionActive?: boolean;
  onSelectTask?: (taskId: string) => void;
  onToggleSelect?: (taskId: string, shiftKey: boolean) => void;
}) {
  const { updateTask, deleteTask } = useTasks();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(task.content);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
    ...(isSelected && !isDragging && {
      borderLeft: '3px solid var(--accent-purple)',
      backgroundColor: 'color-mix(in srgb, var(--accent-purple) 8%, var(--bg-column))',
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

  const cancelPreview = useCallback(() => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
    setShowPreview(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (editing || isDragging || isSelected) return;
    hoverTimer.current = setTimeout(() => setShowPreview(true), 400);
  }, [editing, isDragging, isSelected]);

  // Cancel preview when drag starts or card is selected; clean up timer on unmount
  useEffect(() => {
    if (isDragging || isSelected) cancelPreview();
    return () => clearTimeout(hoverTimer.current);
  }, [isDragging, isSelected, cancelPreview]);

  const handleCardClick = (e: React.MouseEvent) => {
    // If Cmd/Ctrl held or selection mode active, toggle select instead of opening panel
    if (e.metaKey || e.ctrlKey || e.shiftKey || selectionActive) {
      e.preventDefault();
      onToggleSelect?.(task.id, e.shiftKey);
      return;
    }
    if (onSelectTask) {
      onSelectTask(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, position: "relative" }}
      className="group flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-hover)]"
      data-task-id={task.id}
      onClick={(e) => { cancelPreview(); handleCardClick(e); }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={cancelPreview}
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

      {/* Right-aligned metadata: subtask pill, meeting tag, priority dot, delete */}
      <div className="flex items-center gap-1.5 shrink-0">
        <TagPills taskId={task.id} />
        <SubtaskPill taskId={task.id} />

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

      {/* Hover preview popover */}
      {showPreview && <HoverPreview taskId={task.id} />}
    </div>
  );
}
