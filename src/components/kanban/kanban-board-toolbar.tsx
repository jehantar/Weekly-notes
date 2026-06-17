"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTasks } from "@/components/providers/tasks-provider";
import { PRIORITY_LABELS, TAG_COLORS } from "@/lib/constants";
import type { Task, Tag } from "@/lib/types/database";

export type PriorityFilter = "all" | "0" | "1" | "2";
export type MeetingFilterValue = "all" | string;

type MeetingOption = {
  value: string;
  label: string;
};

export type KanbanBoardToolbarProps = {
  tasks: Task[];
  tags: Tag[];
  activeTaskCount: number;
  inProgressCount: number;
  doneCount: number;
  tagFilters: Set<string>;
  priorityFilter: PriorityFilter;
  meetingFilter: MeetingFilterValue;
  doneCollapsed: boolean;
  onToggleTagFilter: (tagId: string) => void;
  onClearTagFilters: () => void;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  onMeetingFilterChange: (value: MeetingFilterValue) => void;
  onToggleDoneCollapsed: () => void;
  onClearAllFilters: () => void;
};

function getMeetingOptions(tasks: Task[]): MeetingOption[] {
  const seen = new Map<string, MeetingOption>();
  for (const task of tasks) {
    if (!task.meeting_title) continue;
    const key = task.meeting_id ?? `${task.meeting_week_start ?? "unknown"}:${task.meeting_title}`;
    if (!seen.has(key)) {
      seen.set(key, { value: key, label: task.meeting_title });
    }
  }
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export function KanbanBoardToolbar({
  tasks,
  tags,
  activeTaskCount,
  inProgressCount,
  doneCount,
  tagFilters,
  priorityFilter,
  meetingFilter,
  doneCollapsed,
  onToggleTagFilter,
  onClearTagFilters,
  onPriorityFilterChange,
  onMeetingFilterChange,
  onToggleDoneCollapsed,
  onClearAllFilters,
}: KanbanBoardToolbarProps) {
  const { addTask } = useTasks();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const meetingOptions = useMemo(() => getMeetingOptions(tasks), [tasks]);

  const hasFilters = tagFilters.size > 0 || priorityFilter !== "all" || meetingFilter !== "all";

  useEffect(() => {
    if (quickAddOpen) inputRef.current?.focus();
  }, [quickAddOpen]);

  const submitQuickAdd = async () => {
    const trimmed = quickAddValue.trim();
    if (!trimmed) {
      setQuickAddValue("");
      setQuickAddOpen(false);
      return;
    }
    await addTask(trimmed, "todo");
    setQuickAddValue("");
    inputRef.current?.focus();
  };

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-2 px-2 py-2"
      style={{
        backgroundColor: "var(--bg-column)",
        border: "1px solid var(--border-card)",
      }}
    >
      <div className="flex items-center gap-2 min-w-[220px]">
        {quickAddOpen ? (
          <input
            ref={inputRef}
            value={quickAddValue}
            onChange={(e) => setQuickAddValue(e.target.value)}
            onBlur={submitQuickAdd}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitQuickAdd();
              }
              if (e.key === "Escape") {
                setQuickAddValue("");
                setQuickAddOpen(false);
              }
            }}
            placeholder="Add task to To Do"
            className="h-7 w-full min-w-0 bg-transparent px-2 text-xs outline-none"
            style={{
              color: "var(--text-primary)",
              border: "1px solid var(--accent-purple)",
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            className="h-7 px-2 text-xs font-medium transition-colors"
            style={{
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-hover)",
              border: "1px solid var(--border-card)",
            }}
          >
            + Add task
          </button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-[11px]" style={{ color: "var(--text-placeholder)" }}>
          <span>{activeTaskCount} active</span>
          <span>{inProgressCount} in progress</span>
          <span>{doneCount} done</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 ml-auto">
        {tags.map((tag) => {
          const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
          const active = tagFilters.has(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggleTagFilter(tag.id)}
              className="h-7 px-2 text-[11px] transition-opacity"
              style={{
                backgroundColor: active ? color.bg : "transparent",
                color: active ? color.text : "var(--text-secondary)",
                border: `1px solid ${active ? color.text : "var(--border-card)"}`,
              }}
            >
              {tag.name}
            </button>
          );
        })}

        {tagFilters.size > 0 && (
          <button
            type="button"
            onClick={onClearTagFilters}
            className="h-7 px-2 text-[11px]"
            style={{ color: "var(--text-placeholder)", border: "1px solid var(--border-card)" }}
          >
            Clear tags
          </button>
        )}

        <select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value as PriorityFilter)}
          className="h-7 bg-transparent px-2 text-[11px] outline-none"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
          aria-label="Filter by priority"
        >
          <option value="all">All priorities</option>
          {PRIORITY_LABELS.map((label, index) => (
            <option key={label} value={String(index)}>
              {label} priority
            </option>
          ))}
        </select>

        <select
          value={meetingFilter}
          onChange={(e) => onMeetingFilterChange(e.target.value)}
          className="h-7 bg-transparent px-2 text-[11px] outline-none"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
          aria-label="Filter by meeting"
        >
          <option value="all">All meetings</option>
          {meetingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleDoneCollapsed}
          className="h-7 px-2 text-[11px]"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
          title={doneCollapsed ? "Show Done column" : "Hide Done column"}
        >
          {doneCollapsed ? "Show Done" : "Hide Done"}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="h-7 px-2 text-[11px]"
            style={{ color: "var(--accent-purple)", border: "1px solid var(--accent-purple)" }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
