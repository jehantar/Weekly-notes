# Kanban Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the persistent Kanban board the default workbench, keep screenshots prominent, preserve notes as a secondary view, and improve board usability with quick capture, filters, cleaner cards, and a more actionable task panel.

**Architecture:** This is a client UI refactor over the existing Supabase-backed task model. No schema migration is required; use the existing `tasks`, `tags`, `task_tags`, `subtasks`, `meetings`, `notes`, and `screenshots` data flows. Keep task persistence in `TasksProvider`, week-scoped data in `WeekProvider`, and move board-only UI state into `KanbanBoard` plus focused child components.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Supabase, Tailwind CSS v4, dnd-kit, TipTap.

## Global Constraints

- No database migration for the first implementation.
- `/week/:weekStart` opens Board by default.
- Header tab order is `Board | Screenshots | Notes | Updates`.
- Screenshots stays prominent and keeps existing behavior.
- Notes remains reachable but is not default and is visually de-emphasized.
- Existing task CRUD, drag/drop, tags, subtasks, meeting links, descriptions, task images, and undo behavior must continue to work.
- Board controls are client-side filters over the loaded task set.
- UI stays compact, stable, and consistent with the existing Linear-inspired design tokens.
- This project has no configured unit test runner. Verification uses `npx tsc --noEmit`, `npm run build`, and browser checks.

---

## File Structure

Create:

- `src/components/kanban/kanban-board-toolbar.tsx` — Compact board toolbar with quick add, counts, tag/priority/meeting filters, Done toggle, and clear filters.

Modify:

- `src/app/week/[weekStart]/week-client.tsx` — Default Board tab, view query handling, and week navigation preservation.
- `src/components/layout/header.tsx` — Tab labels/order and de-emphasized Notes placement.
- `src/components/kanban/kanban-board.tsx` — Board-level filter state, visible-task derivation, toolbar wiring, Done toggle ownership, and filtered column task retrieval.
- `src/components/kanban/kanban-column.tsx` — Column layout polish and Done collapse affordance cleanup.
- `src/components/kanban/kanban-card.tsx` — Card metadata hierarchy, description indicator, focus styles, and compact two-line behavior when metadata exists.
- `src/components/kanban/task-detail-panel.tsx` — Reorder sections around actionable fields and improve metadata scanability.
- `tasks/todo.md` — Local ignored progress tracker.
- `.Codex/memory.md` — Update durable project memory after implementation.

Do not modify:

- Supabase migrations.
- Existing screenshots upload API.
- Existing notes editor behavior.
- Existing unrelated `package-lock.json` changes.
- Existing `.playwright-mcp/` files.

---

### Task 1: Navigation Defaults And Tab Order

**Files:**
- Modify: `src/app/week/[weekStart]/week-client.tsx`
- Modify: `src/components/layout/header.tsx`
- Update: `tasks/todo.md`

**Interfaces:**
- Consumes: Existing `ViewTab` union from `header.tsx`.
- Produces: `ViewTab = "tasks" | "screenshots" | "notes" | "updates"` with `tasks` displayed as `Board`.

- [ ] **Step 1: Update the local tracker**

In `tasks/todo.md`, under `Kanban-First Workbench Redesign`, mark `Create implementation plan after spec approval` complete and add an active implementation checklist:

```markdown
- [x] Create implementation plan after spec approval
- [ ] Implement navigation defaults and tab order
- [ ] Implement board toolbar and filters
- [ ] Implement fast Quick Add
- [ ] Polish cards, columns, and task detail panel
- [ ] Verify behavior with tests and browser checks
- [ ] Document final results here
```

- [ ] **Step 2: Change tab initialization in `week-client.tsx`**

Replace the current active-tab initialization with this helper and state:

```tsx
function parseViewTab(viewParam: string | null): ViewTab {
  if (viewParam === "screenshots") return "screenshots";
  if (viewParam === "notes") return "notes";
  if (viewParam === "updates") return "updates";
  return "tasks";
}

const viewParam = searchParams.get("view");
const [activeTab, setActiveTab] = useState<ViewTab>(() => parseViewTab(viewParam));
```

Expected behavior: missing `view` now means `tasks`, not `notes`.

- [ ] **Step 3: Update query-param handling in `week-client.tsx`**

Replace `handleTabChange` with:

```tsx
const handleTabChange = useCallback((tab: ViewTab) => {
  setActiveTab(tab);
  const url = new URL(window.location.href);
  if (tab === "tasks") {
    url.searchParams.delete("view");
  } else {
    url.searchParams.set("view", tab);
  }
  window.history.replaceState({}, "", url.toString());
}, []);
```

- [ ] **Step 4: Update week navigation suffixes in `week-client.tsx`**

Replace `activeTab !== "notes"` checks with `activeTab !== "tasks"` checks.

The forward suffix should become:

```tsx
const viewSuffix = activeTab !== "tasks" ? `?view=${activeTab}` : "";
```

The left-arrow suffix should use the same rule:

```tsx
router.push(`/week/${formatWeekStart(addWeeksUtil(monday, -1))}${activeTab !== "tasks" ? `?view=${activeTab}` : ""}`);
```

- [ ] **Step 5: Ensure search navigation opens Board**

Keep `handleSearchNavigateToTasks` calling `handleTabChange("tasks")`. This now clears the query param and displays Board.

- [ ] **Step 6: Update `ViewTab` labels/order in `header.tsx`**

Keep the internal union names but render labels through a map:

```tsx
export type ViewTab = "tasks" | "screenshots" | "notes" | "updates";

const VIEW_TABS: { value: ViewTab; label: string }[] = [
  { value: "tasks", label: "Board" },
  { value: "screenshots", label: "Screenshots" },
  { value: "notes", label: "Notes" },
  { value: "updates", label: "Updates" },
];
```

Replace the current tab loop with:

```tsx
{VIEW_TABS.map((tab) => (
  <button
    key={tab.value}
    onClick={() => onTabChange(tab.value)}
    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150"
    style={{
      color: activeTab === tab.value ? 'var(--accent-purple)' : 'var(--text-secondary)',
      borderBottom: activeTab === tab.value ? '2px solid var(--accent-purple)' : '2px solid transparent',
      fontWeight: activeTab === tab.value ? 700 : 500,
      opacity: tab.value === "notes" && activeTab !== "notes" ? 0.72 : 1,
    }}
  >
    {tab.label}
  </button>
))}
```

- [ ] **Step 7: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 8: Commit navigation slice**

Run:

```bash
git add 'src/app/week/[weekStart]/week-client.tsx' src/components/layout/header.tsx
git commit -m "feat: make kanban board the default view"
```

---

### Task 2: Board Toolbar Component

**Files:**
- Create: `src/components/kanban/kanban-board-toolbar.tsx`
- Modify: `src/components/kanban/kanban-board.tsx`

**Interfaces:**
- Produces: `PriorityFilter`, `MeetingFilterValue`, and `KanbanBoardToolbar`.
- Consumes: `Task`, `Tag`, `PRIORITY_LABELS`, `TAG_COLORS`, and `useTasks().addTask`.

- [ ] **Step 1: Create toolbar types and props**

Create `src/components/kanban/kanban-board-toolbar.tsx` with:

```tsx
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
```

- [ ] **Step 2: Add meeting option derivation**

Inside the file, add:

```tsx
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
```

- [ ] **Step 3: Add the toolbar component**

Add this component body:

```tsx
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
```

- [ ] **Step 4: Run type check and remove unused imports**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

---

### Task 3: Board Filters And Quick Add Wiring

**Files:**
- Modify: `src/components/kanban/kanban-board.tsx`
- Modify: `src/components/kanban/tag-filter-bar.tsx` only if it becomes unused and has stale imports elsewhere

**Interfaces:**
- Consumes: `KanbanBoardToolbar`, `PriorityFilter`, `MeetingFilterValue`.
- Produces: combined board filtering by tag, priority, and meeting.

- [ ] **Step 1: Import toolbar types in `kanban-board.tsx`**

Add:

```tsx
import {
  KanbanBoardToolbar,
  type MeetingFilterValue,
  type PriorityFilter,
} from "./kanban-board-toolbar";
```

Remove:

```tsx
import { TagFilterBar } from "./tag-filter-bar";
```

- [ ] **Step 2: Add priority and meeting filter state**

Near the existing `tagFilters` state, add:

```tsx
const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
const [meetingFilter, setMeetingFilter] = useState<MeetingFilterValue>("all");
```

- [ ] **Step 3: Add meeting-key helper**

Inside `KanbanBoard`, before `getColumnTasks`, add:

```tsx
const getTaskMeetingKey = useCallback((task: Task) => {
  if (!task.meeting_title) return null;
  return task.meeting_id ?? `${task.meeting_week_start ?? "unknown"}:${task.meeting_title}`;
}, []);
```

- [ ] **Step 4: Replace `getColumnTasks` filtering**

Replace the current `getColumnTasks` body with:

```tsx
const getColumnTasks = useCallback(
  (status: TaskStatus) => {
    let filtered = tasks.filter((t) => t.status === status);

    if (tagFilters.size > 0) {
      filtered = filtered.filter((t) => {
        const tTags = taskTags[t.id] ?? [];
        return tTags.some((id) => tagFilters.has(id));
      });
    }

    if (priorityFilter !== "all") {
      filtered = filtered.filter((t) => String(safePriority(t.priority)) === priorityFilter);
    }

    if (meetingFilter !== "all") {
      filtered = filtered.filter((t) => getTaskMeetingKey(t) === meetingFilter);
    }

    return filtered;
  },
  [tasks, tagFilters, taskTags, priorityFilter, meetingFilter, getTaskMeetingKey]
);
```

- [ ] **Step 5: Add clear-all-filters callback**

Add:

```tsx
const clearAllFilters = useCallback(() => {
  setTagFilters(new Set());
  setPriorityFilter("all");
  setMeetingFilter("all");
}, []);
```

- [ ] **Step 6: Add board counts**

Before `selectedTask`, add:

```tsx
const activeTaskCount = tasks.filter((t) => t.status !== "done").length;
const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
const doneCount = tasks.filter((t) => t.status === "done").length;
```

- [ ] **Step 7: Replace `TagFilterBar` render with toolbar**

Replace:

```tsx
<TagFilterBar
  activeFilters={tagFilters}
  onToggleFilter={toggleTagFilter}
  onClearFilters={clearTagFilters}
/>
```

with:

```tsx
<KanbanBoardToolbar
  tasks={tasks}
  tags={tags}
  activeTaskCount={activeTaskCount}
  inProgressCount={inProgressCount}
  doneCount={doneCount}
  tagFilters={tagFilters}
  priorityFilter={priorityFilter}
  meetingFilter={meetingFilter}
  doneCollapsed={doneCollapsed}
  onToggleTagFilter={toggleTagFilter}
  onClearTagFilters={clearTagFilters}
  onPriorityFilterChange={setPriorityFilter}
  onMeetingFilterChange={setMeetingFilter}
  onToggleDoneCollapsed={() => setDoneCollapsed((c) => !c)}
  onClearAllFilters={clearAllFilters}
/>
```

Update the `useTasks` destructuring at the top from:

```tsx
const { tasks, taskTags, moveTask, reorderTasks } = useTasks();
```

to:

```tsx
const { tasks, tags, taskTags, moveTask, reorderTasks } = useTasks();
```

- [ ] **Step 8: Keep Done column collapse controlled in one place**

In the `KanbanColumn` render props, keep:

```tsx
{...(status === "done" ? {
  isCollapsed: doneCollapsed,
  onToggleCollapse: () => setDoneCollapsed((c) => !c),
} : {})}
```

This preserves the collapsed strip click and the toolbar toggle.

- [ ] **Step 9: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 10: Commit toolbar and filter slice**

Run:

```bash
git add src/components/kanban/kanban-board-toolbar.tsx src/components/kanban/kanban-board.tsx
git commit -m "feat: add kanban board toolbar and filters"
```

---

### Task 4: Card And Column Polish

**Files:**
- Modify: `src/components/kanban/kanban-card.tsx`
- Modify: `src/components/kanban/kanban-column.tsx`

**Interfaces:**
- Consumes: Existing `Task` fields and `useTasks()` data.
- Produces: More scannable task cards with title, metadata row, description indicator, and stable column behavior.

- [ ] **Step 1: Add a description indicator helper to `kanban-card.tsx`**

Add near the helper components:

```tsx
function DescriptionDot({ task }: { task: Task }) {
  if (!task.description || task.description.trim().length === 0) return null;
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center text-[10px]"
      style={{ color: "var(--text-placeholder)" }}
      title="Has description"
      aria-label="Has description"
    >
      ≡
    </span>
  );
}
```

- [ ] **Step 2: Change the card container layout**

Replace the current outer `className` on the sortable card with:

```tsx
className="group flex min-h-[44px] flex-col justify-center gap-1 px-3 py-2 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-hover)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent-purple)]"
```

Keep existing handlers and `style`.

- [ ] **Step 3: Replace card content layout**

Replace the current `Content` and right-aligned metadata sibling blocks with this structure:

```tsx
<div className="flex items-center gap-2">
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

<div className="flex min-h-4 items-center gap-1.5 overflow-hidden">
  <TagPills taskId={task.id} />
  <SubtaskPill taskId={task.id} />
  <MeetingTagInput task={task} />
  <DescriptionDot task={task} />
</div>
```

- [ ] **Step 4: Ensure empty metadata row does not waste height**

Add this computed value before `return`:

```tsx
const hasMetadata =
  (taskTags[task.id]?.length ?? 0) > 0 ||
  (subtasks[task.id]?.length ?? 0) > 0 ||
  Boolean(task.meeting_title) ||
  Boolean(task.description?.trim());
```

Update the metadata row class to:

```tsx
className={hasMetadata ? "flex min-h-4 items-center gap-1.5 overflow-hidden" : "hidden"}
```

Update the `useTasks` destructuring at the top of `KanbanCard` from:

```tsx
const { updateTask, deleteTask } = useTasks();
```

to:

```tsx
const { updateTask, deleteTask, taskTags, subtasks } = useTasks();
```

- [ ] **Step 5: Stabilize column scrolling**

In `kanban-column.tsx`, replace the cards list wrapper style:

```tsx
style={{ maxHeight: 'calc(100vh - 160px)' }}
```

with:

```tsx
style={{ maxHeight: 'calc(100vh - 190px)' }}
```

This accounts for the new toolbar above the board.

- [ ] **Step 6: Give the collapsed Done strip an accessible button role**

On the collapsed column root, add:

```tsx
role="button"
tabIndex={0}
onKeyDown={(e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    onToggleCollapse?.();
  }
}}
```

Keep `onClick={onToggleCollapse}`.

- [ ] **Step 7: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 8: Commit card and column slice**

Run:

```bash
git add src/components/kanban/kanban-card.tsx src/components/kanban/kanban-column.tsx
git commit -m "feat: refine kanban cards and columns"
```

---

### Task 5: Task Detail Panel Actionability

**Files:**
- Modify: `src/components/kanban/task-detail-panel.tsx`

**Interfaces:**
- Consumes: Existing `PropertyDropdown`, `MeetingTagInput`, `TagPicker`, `SubtaskList`, and `TaskDescriptionEditor`.
- Produces: Same persisted fields, reordered and visually grouped for actionability.

- [ ] **Step 1: Update the properties wrapper**

Replace the current properties section wrapper:

```tsx
<div className="mb-6">
```

with:

```tsx
<div
  className="mb-5 overflow-hidden"
  style={{
    border: '1px solid var(--border-card)',
    backgroundColor: 'var(--bg-column)',
  }}
>
```

Keep the existing `PropertyDropdown`, meeting row, and `TagPicker` inside it.

- [ ] **Step 2: Add a compact section heading for work breakdown**

Replace the subtasks wrapper with:

```tsx
<div className="mb-5">
  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
    Subtasks
  </div>
  <SubtaskList taskId={task.id} />
</div>
```

- [ ] **Step 3: Rename the description heading to context**

Replace:

```tsx
Description
```

with:

```tsx
Context
```

This copy reflects that Gemini notes and links may later be referenced here without changing the storage field.

- [ ] **Step 4: Keep panel persistence unchanged**

Confirm these callbacks remain unchanged:

```tsx
const handleStatusChange = useCallback(
  (value: string) => {
    const newStatus = value as TaskStatus;
    if (newStatus !== task.status) {
      moveTask(task.id, newStatus, 0);
    }
  },
  [task.id, task.status, moveTask]
);

const handleDescriptionSave = useCallback(
  (html: string) => {
    updateTask(task.id, { description: html || null });
  },
  [task.id, updateTask]
);
```

- [ ] **Step 5: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 6: Commit panel slice**

Run:

```bash
git add src/components/kanban/task-detail-panel.tsx
git commit -m "feat: make task panel more action focused"
```

---

### Task 6: Verification And Final Cleanup

**Files:**
- Modify: `tasks/todo.md`
- Modify: `.Codex/memory.md`
- Modify: any implementation file only if verification finds a concrete issue.

**Interfaces:**
- Consumes: Completed Tasks 1-5.
- Produces: Verified Kanban Workbench implementation and final project memory update.

- [ ] **Step 1: Run type check**

Run:

```bash
npx tsc --noEmit
```

Expected: exits `0`.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: exits `0`.

- [ ] **Step 3: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL, usually `http://localhost:3000`.

- [ ] **Step 4: Browser-check navigation**

Open the local URL for the current week.

Manual checks:

- `/week/:weekStart` displays Board.
- Header order is Board, Screenshots, Notes, Updates.
- Clicking Screenshots sets `?view=screenshots`.
- Clicking Notes sets `?view=notes`.
- Clicking Board removes the `view` query param.
- Week left/right navigation preserves Screenshots, Notes, or Updates when active.
- Week left/right navigation keeps Board implicit when Board is active.

- [ ] **Step 5: Browser-check board workflow**

Manual checks:

- Quick Add creates a To Do task.
- Quick Add remains focused after creating a non-empty task.
- Empty Quick Add blur closes without creating a task.
- Escape closes Quick Add.
- Column add still creates tasks in the selected column.
- Drag/drop still moves tasks between columns.
- Reordering inside a column still persists visually.
- Done collapse works from toolbar and collapsed strip.

- [ ] **Step 6: Browser-check filters**

Manual checks:

- Tag filters still narrow visible tasks.
- Priority filter narrows visible tasks.
- Meeting filter narrows visible tasks with linked meetings.
- Tag, priority, and meeting filters combine.
- Clear tags clears only tag filters.
- Clear filters clears tag, priority, and meeting filters.

- [ ] **Step 7: Browser-check task detail panel**

Manual checks:

- Clicking a card opens the detail panel.
- Clicking a card title edits inline instead of opening the panel.
- Status change moves the task.
- Priority change updates the card indicator.
- Meeting link still saves.
- Tags still save.
- Subtasks still add/update/toggle.
- Context editor still saves rich text.
- Escape and outside click close the panel.

- [ ] **Step 8: Browser-check secondary surfaces**

Manual checks:

- Screenshots paste/upload/caption/delete behavior still works.
- Notes remains reachable and editable.
- Updates remains reachable.
- Search still opens with `/` and `Cmd+K`.
- Search task navigation switches to Board.

- [ ] **Step 9: Fix issues found during verification**

For each issue, make the smallest code change that addresses the observed failure, then rerun the relevant verification command or browser check.

If fixes touch implementation files, commit them:

```bash
git add <fixed-files>
git commit -m "fix: address kanban workbench verification issues"
```

- [ ] **Step 10: Update local tracker and memory**

In `tasks/todo.md`, mark:

```markdown
- [x] Implement navigation defaults and tab order
- [x] Implement board toolbar and filters
- [x] Implement fast Quick Add
- [x] Polish cards, columns, and task detail panel
- [x] Verify behavior with tests and browser checks
- [x] Document final results here
```

In `.Codex/memory.md`, append:

```markdown
- Kanban Workbench implementation completed: Board is default, Screenshots is second, Notes is de-emphasized, and the board has quick add plus tag/priority/meeting filtering.
```

- [ ] **Step 11: Commit memory update if `.Codex/memory.md` changed**

Run:

```bash
git add .Codex/memory.md
git commit -m "docs: update memory for kanban workbench"
```

---

## Self-Review

Spec coverage:

- Default Board routing: Task 1.
- Screenshots before Notes: Task 1.
- Notes retained and de-emphasized: Task 1.
- Board toolbar with Quick Add and filters: Tasks 2 and 3.
- Client-side tag, priority, and meeting filters: Task 3.
- Done collapse behavior: Tasks 3 and 4.
- Card metadata hierarchy: Task 4.
- Task detail panel actionability: Task 5.
- No database migration: Global constraints and file structure.
- Verification: Task 6.

Placeholder scan:

- No red-flag placeholder wording or open-ended implementation steps are present.
- The phrase `To Do` appears only as the existing task status label.

Type consistency:

- `PriorityFilter` is `"all" | "0" | "1" | "2"` and is compared to `String(safePriority(task.priority))`.
- `MeetingFilterValue` is `"all" | string` and uses the same meeting-key derivation in toolbar options and board filtering.
- `ViewTab` keeps existing internal value `"tasks"` while the UI label becomes `Board`.
