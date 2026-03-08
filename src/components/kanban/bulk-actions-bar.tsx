"use client";

import { useState, useRef, useEffect } from "react";
import { useTasks } from "@/components/providers/tasks-provider";
import { TASK_STATUSES, TASK_STATUS_LABELS, STATUS_DOT_COLORS, TAG_COLORS } from "@/lib/constants";
import type { TaskStatus } from "@/lib/types/database";

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
}: {
  selectedIds: Set<string>;
  onClearSelection: () => void;
}) {
  const { bulkMoveTasks, bulkDeleteTasks, bulkAddTag, tags } = useTasks();
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const moveRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const count = selectedIds.size;
  const ids = Array.from(selectedIds);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false);
      }
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) {
        setShowTagMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMove = async (status: TaskStatus) => {
    await bulkMoveTasks(ids, status);
    setShowMoveMenu(false);
    onClearSelection();
  };

  const handleTag = async (tagId: string) => {
    await bulkAddTag(ids, tagId);
    setShowTagMenu(false);
    onClearSelection();
  };

  const handleDelete = () => {
    bulkDeleteTasks(ids);
    onClearSelection();
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 z-50"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--accent-purple)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        animation: "fadeSlideIn 150ms ease-out",
      }}
    >
      <span className="text-xs font-medium" style={{ color: "var(--accent-purple)" }}>
        {count} selected
      </span>

      <div className="w-px h-4" style={{ backgroundColor: "var(--border-card)" }} />

      {/* Move dropdown */}
      <div className="relative" ref={moveRef}>
        <button
          onClick={() => { setShowMoveMenu((v) => !v); setShowTagMenu(false); }}
          className="text-xs px-2 py-1 transition-colors"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Move
        </button>
        {showMoveMenu && (
          <div
            className="absolute bottom-full mb-1 left-0 py-1 min-w-[140px]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            {TASK_STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleMove(status)}
                className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_DOT_COLORS[status] }}
                />
                {TASK_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tag dropdown */}
      <div className="relative" ref={tagRef}>
        <button
          onClick={() => { setShowTagMenu((v) => !v); setShowMoveMenu(false); }}
          className="text-xs px-2 py-1 transition-colors"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          Tag
        </button>
        {showTagMenu && (
          <div
            className="absolute bottom-full mb-1 left-0 py-1 min-w-[140px]"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-card)" }}
          >
            {tags.length === 0 ? (
              <div className="px-3 py-1.5 text-xs" style={{ color: "var(--text-placeholder)" }}>
                No tags
              </div>
            ) : (
              tags.map((tag) => {
                const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTag(tag.id)}
                    className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color.text }}
                    />
                    {tag.name}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="text-xs px-2 py-1 transition-colors"
        style={{ color: "#dc2626", border: "1px solid color-mix(in srgb, #dc2626 30%, transparent)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        Delete
      </button>

      <div className="w-px h-4" style={{ backgroundColor: "var(--border-card)" }} />

      {/* Clear selection */}
      <button
        onClick={onClearSelection}
        className="text-xs transition-colors"
        style={{ color: "var(--text-placeholder)" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-placeholder)")}
      >
        Clear
      </button>
    </div>
  );
}
