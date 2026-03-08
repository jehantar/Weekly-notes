"use client";

import { useState, useRef, useEffect } from "react";
import { useTasks } from "@/components/providers/tasks-provider";

export function SubtaskList({ taskId }: { taskId: string }) {
  const {
    subtasks,
    fetchSubtasks,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
  } = useTasks();

  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSubtasks(taskId);
  }, [taskId, fetchSubtasks]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const list = subtasks[taskId] ?? [];

  const handleAdd = async () => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    await addSubtask(taskId, trimmed);
    setNewContent("");
    inputRef.current?.focus();
  };

  const handleEditSave = (id: string) => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== list.find((s) => s.id === id)?.content) {
      updateSubtask(id, taskId, { content: trimmed });
    }
    setEditingId(null);
  };

  return (
    <div>
      <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        Subtasks
        {list.length > 0 && (
          <span className="ml-1.5 font-normal" style={{ color: 'var(--text-placeholder)' }}>
            {list.filter((s) => s.completed).length}/{list.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {list.length > 0 && (
        <div
          className="h-1 mb-2 overflow-hidden"
          style={{ backgroundColor: 'var(--bg-page)' }}
        >
          <div
            className="h-full transition-all duration-200"
            style={{
              width: `${(list.filter((s) => s.completed).length / list.length) * 100}%`,
              backgroundColor: 'var(--accent-purple)',
            }}
          />
        </div>
      )}

      {/* Subtask items */}
      <div className="space-y-px">
        {list.map((subtask) => (
          <div
            key={subtask.id}
            className="group/subtask flex items-center gap-2 py-1.5 px-1"
            style={{ borderBottom: '1px solid var(--border-card)' }}
          >
            <button
              onClick={() => toggleSubtask(subtask.id, taskId)}
              className="shrink-0 w-3.5 h-3.5 flex items-center justify-center"
              style={{
                border: `1px solid ${subtask.completed ? 'var(--accent-purple)' : 'var(--border-card)'}`,
                backgroundColor: subtask.completed ? 'var(--accent-purple)' : 'transparent',
              }}
            >
              {subtask.completed && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>

            {editingId === subtask.id ? (
              <input
                ref={editInputRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onBlur={() => handleEditSave(subtask.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave(subtask.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                className="flex-1 text-xs bg-transparent outline-none"
                style={{
                  color: 'var(--text-primary)',
                  borderBottom: '1px solid var(--accent-purple)',
                }}
              />
            ) : (
              <span
                className="flex-1 text-xs cursor-text"
                style={{
                  color: subtask.completed ? 'var(--text-placeholder)' : 'var(--text-primary)',
                  textDecoration: subtask.completed ? 'line-through' : 'none',
                }}
                onClick={() => {
                  setEditingId(subtask.id);
                  setEditContent(subtask.content);
                }}
              >
                {subtask.content}
              </span>
            )}

            <button
              onClick={() => deleteSubtask(subtask.id, taskId)}
              className="shrink-0 opacity-0 group-hover/subtask:opacity-100 transition-opacity text-[10px]"
              style={{ color: 'var(--text-placeholder)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Add subtask input */}
      <div className="flex items-center gap-2 mt-1 py-1.5 px-1">
        <span className="shrink-0 text-xs" style={{ color: 'var(--text-placeholder)' }}>+</span>
        <input
          ref={inputRef}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
            if (e.key === "Escape") {
              setNewContent("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Add subtask..."
          className="flex-1 text-xs bg-transparent outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>
    </div>
  );
}
