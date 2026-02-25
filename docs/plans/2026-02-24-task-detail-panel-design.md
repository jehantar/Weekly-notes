# Task Detail Panel — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the read-only task detail placeholder with a fully interactive side panel featuring editable properties and a rich text description editor with image support.

**Architecture:** Side panel component portaled outside DndContext. TipTap editor for description (same stack as notes). Supabase Storage for image uploads via a Next.js API route.

---

## 1. Panel Layout

400px wide, slides from right, `--bg-card` background, `--border-card` left border. Rendered via React portal outside `<DndContext>` to avoid pointer event conflicts with dnd-kit.

**Structure (top to bottom):**

1. **Header** — Editable title (click to edit, inline input, 16px semibold). Close button (×) top-right.
2. **Properties section** — Key-value rows, each clickable to edit:
   - **Status** — Dropdown: backlog, todo, in_progress, done. Each option shows colored status dot + label. Selecting calls `moveTask()`.
   - **Priority** — Dropdown: Low, Medium, High. Each option shows colored priority dot + label. Selecting calls `updateTask()`.
   - **Meeting** — Reuse `MeetingTagInput` component.
3. **Description** — TipTap rich text editor. Placeholder: "Add a description..." Autosaves via `updateTask()` on 1s debounce.
4. **Footer** — Created date, completed date (read-only, `--text-placeholder` color).

**Close triggers:** Escape key, click outside panel, × button.

---

## 2. Rich Text Editor (Description)

Reuses the TipTap pattern from `notes-cell.tsx`.

**Extensions:**
- `StarterKit` (bold, italic, code, blockquote, hard break, bullet list, ordered list)
- `Underline`
- `Link` — auto-detects pasted URLs, opens in new tab
- `Image` — renders `<img>` tags with Supabase Storage URLs
- `Placeholder` — "Add a description..."
- `ListKeymap` — Tab/Shift+Tab for nested bullet/numbered list indentation

**Toolbar:** Appears on focus (same fadeSlideIn pattern as notes toolbar). Buttons: **B**, *I*, U, bullet list, ordered list, link.

**Autosave:** 1s debounce on `onUpdate`. Immediate save on `onBlur`. Escape reverts to last saved content.

**Storage format:** HTML string in the `description` column (same as notes).

---

## 3. Image Upload

**Supabase Storage:**
- Bucket: `task-images`, public read, authenticated write
- Path pattern: `{user_id}/{task_id}/{timestamp}-{filename}`

**API route:** `POST /api/tasks/upload-image`
- Accepts multipart form data (file + taskId)
- Validates: authenticated user, file type (png/jpg/gif/webp), max 5MB
- Uploads to Supabase Storage bucket
- Returns public URL

**TipTap integration:**
- Paste handler: intercept clipboard paste events containing images
- Extract image blob, upload via API, insert `<img>` node with returned URL
- No drag-and-drop file upload, no explicit upload button — paste only

---

## 4. Database Changes

**Migration:** Add `description` column to tasks table.

```sql
ALTER TABLE tasks ADD COLUMN description TEXT;
```

**Types:** Update `database.ts` — add `description: string | null` to tasks Row, Insert, and Update types.

No other schema changes. Status, priority, meeting linking all use existing columns.

---

## 5. Component Structure

**New files:**
- `src/components/kanban/task-detail-panel.tsx` — Main panel component
- `src/components/kanban/task-description-editor.tsx` — TipTap editor for description
- `src/components/kanban/property-dropdown.tsx` — Reusable inline dropdown for status/priority
- `src/app/api/tasks/upload-image/route.ts` — Image upload API
- `supabase/migrations/20240101000005_add_task_description.sql` — DB migration

**Modified files:**
- `src/components/kanban/kanban-board.tsx` — Remove inline placeholder, render `TaskDetailPanel` via portal
- `src/lib/types/database.ts` — Add description field
- `src/app/globals.css` — TipTap styles for description editor (reuse `.tiptap-notes` pattern)

---

## 6. Design Tokens

All styling uses existing CSS custom properties:
- Panel bg: `--bg-card`
- Borders: `--border-card`
- Dropdown bg: `--bg-card`, hover: `--bg-hover`
- Text: `--text-primary`, `--text-secondary`, `--text-placeholder`
- Accent: `--accent-purple` for active states
- Status/priority dot colors from `STATUS_DOT_COLORS` and `PRIORITY_DOT_COLORS` constants
