"use client";

import { useState, useRef, useEffect } from "react";
import { useTasks } from "@/components/providers/tasks-provider";
import { TAG_COLORS, TAG_COLOR_KEYS } from "@/lib/constants";

export function TagPicker({ taskId }: { taskId: string }) {
  const { tags, taskTags, addTagToTask, removeTagFromTask, createTag } = useTasks();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("purple");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const assignedIds = taskTags[taskId] ?? [];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (creating) nameInputRef.current?.focus();
  }, [creating]);

  const handleCreateTag = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const tag = await createTag(trimmed, newColor);
    if (tag) {
      await addTagToTask(taskId, tag.id);
      setNewName("");
      setCreating(false);
    }
  };

  return (
    <div
      className="flex items-center justify-between py-2 text-xs"
      style={{ borderBottom: '1px solid var(--border-card)' }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>Tags</span>
      <div className="relative flex items-center gap-1 flex-wrap justify-end" ref={dropdownRef}>
        {/* Assigned tags */}
        {assignedIds.map((tagId) => {
          const tag = tags.find((t) => t.id === tagId);
          if (!tag) return null;
          const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
          return (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px]"
              style={{ backgroundColor: color.bg, color: color.text }}
            >
              {tag.name}
              <button
                onClick={() => removeTagFromTask(taskId, tag.id)}
                className="leading-none hover:opacity-70"
              >
                &times;
              </button>
            </span>
          );
        })}

        {/* Add button */}
        <button
          onClick={() => setOpen(!open)}
          className="text-[10px] px-1 py-0.5 transition-colors"
          style={{
            color: 'var(--text-placeholder)',
            border: '1px dashed var(--border-card)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--text-placeholder)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-card)')}
        >
          +
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50 w-48 py-1 shadow-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
            }}
          >
            {tags.map((tag) => {
              const isAssigned = assignedIds.includes(tag.id);
              const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
              return (
                <button
                  key={tag.id}
                  onClick={() => {
                    if (isAssigned) {
                      removeTagFromTask(taskId, tag.id);
                    } else {
                      addTagToTask(taskId, tag.id);
                    }
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color.text }}
                  />
                  <span style={{ color: 'var(--text-primary)' }}>{tag.name}</span>
                  {isAssigned && (
                    <span className="ml-auto" style={{ color: 'var(--accent-purple)' }}>&#x2713;</span>
                  )}
                </button>
              );
            })}

            {/* Create new tag */}
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full text-left px-3 py-1.5 text-xs transition-colors"
                style={{ color: 'var(--text-placeholder)', borderTop: tags.length > 0 ? '1px solid var(--border-card)' : 'none' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                + Create new tag
              </button>
            ) : (
              <div
                className="px-3 py-2 space-y-2"
                style={{ borderTop: '1px solid var(--border-card)' }}
              >
                <input
                  ref={nameInputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateTag();
                    if (e.key === "Escape") setCreating(false);
                  }}
                  placeholder="Tag name"
                  className="w-full text-xs bg-transparent outline-none px-1 py-1"
                  style={{
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-card)',
                  }}
                />
                <div className="flex gap-1">
                  {TAG_COLOR_KEYS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewColor(c)}
                      className="w-4 h-4 rounded-full transition-transform"
                      style={{
                        backgroundColor: TAG_COLORS[c].text,
                        outline: newColor === c ? '2px solid var(--text-primary)' : 'none',
                        outlineOffset: '1px',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleCreateTag}
                  className="text-[10px] px-2 py-0.5 transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-purple)',
                    color: 'white',
                  }}
                >
                  Create
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
