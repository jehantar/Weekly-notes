"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTasks } from "@/components/providers/tasks-provider";
import { PropertyDropdown } from "./property-dropdown";
import { TaskDescriptionEditor } from "./task-description-editor";
import { MeetingTagInput } from "./meeting-tag-input";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  STATUS_DOT_COLORS,
  PRIORITY_LABELS,
  PRIORITY_DOT_COLORS,
  safePriority,
} from "@/lib/constants";
import type { Task, TaskStatus } from "@/lib/types/database";

type TaskDetailPanelProps = {
  task: Task;
  onClose: () => void;
};

const statusOptions = TASK_STATUSES.map((s) => ({
  value: s,
  label: TASK_STATUS_LABELS[s],
  dotColor: STATUS_DOT_COLORS[s],
}));

const priorityOptions = PRIORITY_LABELS.map((label, i) => ({
  value: String(i),
  label,
  dotColor: PRIORITY_DOT_COLORS[i],
}));

export function TaskDetailPanel({ task, onClose }: TaskDetailPanelProps) {
  const { updateTask, moveTask } = useTasks();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(task.content);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync title when task changes externally
  useEffect(() => {
    if (!editingTitle) setTitleValue(task.content);
  }, [task.content, editingTitle]);

  // Focus title input when entering edit mode
  useEffect(() => {
    if (editingTitle) titleInputRef.current?.select();
  }, [editingTitle]);

  // Close on Escape when not inside an editable element
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isEditable) return;
      onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const saveTitle = useCallback(() => {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== task.content) {
      updateTask(task.id, { content: trimmed });
    } else {
      setTitleValue(task.content);
    }
  }, [titleValue, task.content, task.id, updateTask]);

  const handleStatusChange = useCallback(
    (value: string) => {
      const newStatus = value as TaskStatus;
      if (newStatus !== task.status) {
        moveTask(task.id, newStatus, 0);
      }
    },
    [task.id, task.status, moveTask]
  );

  const handlePriorityChange = useCallback(
    (value: string) => {
      const newPriority = parseInt(value);
      if (newPriority !== task.priority) {
        updateTask(task.id, { priority: newPriority });
      }
    },
    [task.id, task.priority, updateTask]
  );

  const handleDescriptionSave = useCallback(
    (html: string) => {
      updateTask(task.id, { description: html || null });
    },
    [task.id, updateTask]
  );

  const panel = (
    <div
      className="fixed top-0 right-0 h-full z-50 flex"
      onClick={onClose}
    >
      <div
        className="w-[400px] h-full overflow-y-auto p-6 flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-card)',
          animation: 'fadeSlideIn 100ms ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: editable title + close */}
        <div className="flex items-start justify-between mb-6 gap-2">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") {
                  setTitleValue(task.content);
                  setEditingTitle(false);
                }
              }}
              className="flex-1 text-base font-semibold bg-transparent outline-none"
              style={{
                color: 'var(--text-primary)',
                borderBottom: '2px solid var(--accent-purple)',
              }}
            />
          ) : (
            <h2
              className="flex-1 text-base font-semibold cursor-pointer"
              style={{ color: 'var(--text-primary)' }}
              onClick={() => setEditingTitle(true)}
            >
              {task.content}
            </h2>
          )}
          <button
            onClick={onClose}
            className="text-sm shrink-0 mt-0.5 transition-colors"
            style={{ color: 'var(--text-placeholder)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
          >
            &times;
          </button>
        </div>

        {/* Properties */}
        <div className="mb-6">
          <PropertyDropdown
            label="Status"
            value={task.status}
            options={statusOptions}
            onChange={handleStatusChange}
          />
          <PropertyDropdown
            label="Priority"
            value={String(safePriority(task.priority))}
            options={priorityOptions}
            onChange={handlePriorityChange}
          />
          <div
            className="flex items-center justify-between py-2 text-xs"
            style={{ borderBottom: '1px solid var(--border-card)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Meeting</span>
            <MeetingTagInput task={task} />
          </div>
        </div>

        {/* Description */}
        <div className="flex-1 mb-6">
          <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
            Description
          </div>
          <TaskDescriptionEditor
            taskId={task.id}
            content={task.description ?? ""}
            onSave={handleDescriptionSave}
          />
        </div>

        {/* Footer: dates */}
        <div className="text-[11px] space-y-1" style={{ color: 'var(--text-placeholder)' }}>
          {task.created_at && (
            <div>Created {new Date(task.created_at).toLocaleDateString()}</div>
          )}
          {task.completed_at && (
            <div>Completed {new Date(task.completed_at).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
