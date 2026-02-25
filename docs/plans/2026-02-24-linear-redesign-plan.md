# Linear-Inspired Full App Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the entire Weekly Notes app to match Linear's aesthetic — dark mode, Inter font, monochrome + purple accent, compact information density, task detail panel.

**Architecture:** CSS custom property swap for global dark theme, component-by-component restyling (mostly inline styles + Tailwind classes), one new component (TaskDetailPanel), one DB migration (task description field). No structural changes to providers or data flow.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase, dnd-kit, TipTap, Inter font (Google Fonts)

**Design doc:** `docs/plans/2026-02-24-linear-redesign-design.md`

---

## Phase 1: Foundation (globals, layout, constants)

### Task 1: Update global design tokens and font

**Files:**
- Modify: `src/app/globals.css` (lines 1-17)
- Modify: `src/app/layout.tsx` (line 22)

**Step 1:** Replace `globals.css` font import and CSS custom properties.

Replace the JetBrains Mono import (line 1) with Inter:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
```

Replace all `:root` CSS custom properties (lines 5-17) with:
```css
:root {
  --bg-page: #0F0F11;
  --bg-card: #1B1C1E;
  --bg-column: #161618;
  --bg-hover: #232428;
  --border-card: #2A2B2E;
  --accent-purple: #848CD0;
  --text-primary: #ECECED;
  --text-secondary: #8B8C90;
  --text-placeholder: #4E4F54;
  --shadow-card-drag: 0 8px 24px -4px rgb(0 0 0 / 0.4);
}
```

Remove `--shadow-card`, `--shadow-card-hover`, `--bg-column` (old). Add `--bg-hover`.

Update TipTap placeholder color (line 64): `color: var(--text-placeholder);` (replace `#d1d5db`).

**Step 2:** Update `layout.tsx` font family.

In the inline style on the body element (line 22), change `fontFamily` from `'JetBrains Mono', monospace` to `'Inter', sans-serif`.

**Step 3:** Verify build: `npx next build`

**Step 4:** Commit: `git commit -m "feat: switch to dark mode with Inter font and Linear color tokens"`

---

### Task 2: Update constants (remove status accent colors)

**Files:**
- Modify: `src/lib/constants.ts`

**Step 1:** Remove `STATUS_ACCENT_COLORS` — not needed in the new design (columns have no accent top lines). The priority colors stay.

**Step 2:** Verify build, commit: `git commit -m "refactor: remove status accent colors from constants"`

---

## Phase 2: Kanban Board

### Task 3: Restyle kanban columns

**Files:**
- Modify: `src/components/kanban/kanban-column.tsx`

**Step 1:** Restyle the column for dark mode. Key changes:
- Remove `borderTop` accent line (was `2px solid ${accentColor}`)
- Remove `STATUS_ACCENT_COLORS` import
- Background: `--bg-column` default, `color-mix(in srgb, var(--accent-purple) 6%, var(--bg-column))` on drop hover
- Column headers: 12px medium weight `--text-secondary`, count as plain number (no chip background)
- Add small colored status circle before label (use a simple div with background color per status — backlog gray, todo blue, in_progress purple, done green)
- Empty state: `--text-placeholder` text, dashed `--border-card` border
- Add button: `--text-placeholder`, hover-reveal
- Collapsed Done: restyle for dark (dark bg, light text, no accent border)

**Step 2:** Verify build, commit: `git commit -m "feat: restyle kanban columns for dark mode"`

---

### Task 4: Restyle kanban cards

**Files:**
- Modify: `src/components/kanban/kanban-card.tsx`

**Step 1:** Redesign cards. Key changes:
- Compact: `px-3 py-2` (was `p-2.5`)
- Background: `transparent` default, `--bg-hover` on hover
- Border: `1px solid var(--border-card)` (subtle)
- Remove priority left stripe — priority dot moves to right side of card (after title)
- Layout: title (flex-1, truncate) → meeting tag → priority dot → delete button (all inline)
- Hover: `--bg-hover` background (remove shadow changes and purple border)
- Ghost state: adapt to dark (opacity 0.3, `--bg-column` bg, dashed `--border-card`)
- Focus ring: `2px solid var(--accent-purple)` (keep)
- Done state: `--text-placeholder` + line-through (keep)
- Edit mode: purple bottom border (keep, works in dark)
- Delete button: `--text-placeholder`, `#dc2626` on hover (keep)

**Step 2:** Verify build, commit: `git commit -m "feat: restyle kanban cards — compact, transparent, right-aligned metadata"`

---

### Task 5: Restyle drag overlay

**Files:**
- Modify: `src/components/kanban/kanban-board.tsx` (DragOverlayCard function, lines 22-63)

**Step 1:** Update DragOverlayCard for dark mode:
- Background: `--bg-card`
- Border: `1px solid var(--accent-purple)`
- Shadow: `var(--shadow-card-drag)` (the only remaining shadow)
- Keep `scale(1.02) rotate(-0.5deg)` transform
- Match new card layout (title → meeting tag → priority dot)

**Step 2:** Verify build, commit: `git commit -m "feat: restyle drag overlay for dark mode"`

---

### Task 6: Restyle add-task-inline and meeting-tag-input

**Files:**
- Modify: `src/components/kanban/add-task-inline.tsx`
- Modify: `src/components/kanban/meeting-tag-input.tsx`

**Step 1:** Update add-task-inline:
- Background: `--bg-card`, border: `1px solid var(--accent-purple)`, no shadow
- Input: `--text-primary` on transparent bg, placeholder `--text-placeholder`

**Step 2:** Update meeting-tag-input:
- Tag chip: `color-mix(in srgb, var(--accent-purple) 15%, transparent)` bg (works in dark)
- Dropdown: `--bg-card` bg, `--border-card` border, no shadow
- Hover items: `--bg-hover` instead of `bg-black/5`
- Filter input: `--text-primary`, `--border-card` underline

**Step 3:** Verify build, commit: `git commit -m "feat: restyle add-task and meeting-tag for dark mode"`

---

### Task 7: Add task detail panel

**Files:**
- Create: `src/components/kanban/task-detail-panel.tsx`
- Modify: `src/components/kanban/kanban-board.tsx` (add state for selected task)
- Modify: `src/components/kanban/kanban-card.tsx` (add click handler to open panel)
- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_task_description.sql`
- Modify: `src/lib/types/database.ts` (add description field)

**Step 1:** Create Supabase migration to add `description` column:
```sql
ALTER TABLE tasks ADD COLUMN description text;
```

**Step 2:** Update `src/lib/types/database.ts` — add `description: string | null` to tasks Row/Insert/Update.

**Step 3:** Create `task-detail-panel.tsx`:
- Slides in from right, 400px wide, `--bg-card` background, `--border-card` left border
- Overlay: click-outside to close, Escape to close
- Header: task title (large, 16px, semibold, editable — click to edit inline)
- Properties section with rows:
  - **Status:** label + dropdown of 4 statuses with colored circles
  - **Priority:** label + dropdown (Low/Medium/High) with colored dots
  - **Meeting:** label + MeetingTagInput (reuse existing component)
- Description area: `<textarea>` with autosave (debounced, same pattern as notes)
- Footer: "Created" + date, "Completed" + date (if done)
- All styled with dark mode tokens

**Step 4:** Wire into kanban-board.tsx:
- Add `selectedTaskId` state
- Pass `onSelectTask` callback to KanbanColumn → KanbanCard
- Render `<TaskDetailPanel>` conditionally when `selectedTaskId` is set
- Board layout: `flex` with `flex-1` for columns area and fixed-width panel

**Step 5:** Wire into kanban-card.tsx:
- Click on the card (not on text, not on priority dot, not on delete) opens detail panel via `onSelectTask(task.id)`
- Click on text still does inline rename
- `Space` key on focused card also opens detail panel

**Step 6:** Run migration: `supabase db push` or apply locally.

**Step 7:** Verify build, commit: `git commit -m "feat: add task detail side panel with description field"`

---

## Phase 3: Header & Navigation

### Task 8: Restyle header, week-nav, calendar-picker

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/week-nav.tsx`
- Modify: `src/components/layout/calendar-picker.tsx`

**Step 1:** Update header:
- Remove bottom border or make it `--border-card` (barely visible)
- Tab switcher: `--text-secondary` inactive, `--accent-purple` active with 2px bottom underline
- Search button: ghost style, `--text-secondary`, `--bg-hover` on hover
- Replace `hover:bg-gray-100` everywhere with style-based `--bg-hover`

**Step 2:** Update week-nav:
- All buttons: ghost style — transparent bg, `--text-secondary`, `--bg-hover` on hover
- Remove all `hover:bg-gray-100` Tailwind classes (doesn't work in dark mode)
- Borders: `--border-card`

**Step 3:** Update calendar-picker:
- Button: ghost style like week-nav
- Dropdown: `--bg-card` bg, `--border-card` border
- DayPicker: will need dark-mode color overrides (selected day: `--accent-purple`)

**Step 4:** Verify build, commit: `git commit -m "feat: restyle header, nav, and calendar for dark mode"`

---

## Phase 4: Day Cards

### Task 9: Restyle day-card and day-cards

**Files:**
- Modify: `src/components/layout/day-card.tsx`
- Modify: `src/components/layout/day-cards.tsx`

**Step 1:** Update day-card:
- Card background: `--bg-card`
- Border: `--border-card` (today gets `--accent-purple` top border)
- Shadow: none (remove box-shadow)
- Day header: number `--text-primary` (today `--accent-purple`), name `--text-secondary`
- Section labels: `--text-placeholder`
- Section dividers: `--border-card`

**Step 2:** Verify build, commit: `git commit -m "feat: restyle day cards for dark mode"`

---

### Task 10: Restyle meetings and notes components

**Files:**
- Modify: `src/components/meetings/meetings-cell.tsx`
- Modify: `src/components/meetings/meeting-item.tsx`
- Modify: `src/components/notes/notes-cell.tsx`
- Modify: `src/components/notes/note-toolbar.tsx`

**Step 1:** Update meeting-item:
- Replace all Tailwind gray classes with dark-mode equivalents:
  - `text-gray-400` → `style={{ color: 'var(--text-placeholder)' }}`
  - `text-gray-500` → `style={{ color: 'var(--text-secondary)' }}`
  - `text-blue-500` → `style={{ color: 'var(--accent-purple)' }}`
  - `hover:text-red-500` → keep `#dc2626` hover via inline style
- Row hover: `--bg-hover`

**Step 2:** Update meetings-cell:
- Add button: `--text-placeholder`, hover reveal

**Step 3:** Update note-toolbar:
- Active button: `--bg-hover` bg, `--text-primary` text
- Inactive: `--text-secondary`, hover `--bg-hover`
- Replace all `bg-gray-*`, `text-gray-*` Tailwind classes

**Step 4:** Verify build, commit: `git commit -m "feat: restyle meetings and notes for dark mode"`

---

## Phase 5: Modals & Overlays

### Task 11: Restyle search command

**Files:**
- Modify: `src/components/layout/search-command.tsx`

**Step 1:** Update search overlay:
- Backdrop: `rgba(0,0,0,0.5)` with `blur(4px)` (darker for dark mode)
- Modal: `--bg-card` bg, `--border-card` border
- Input: transparent bg, `--text-primary`, larger (14px)
- Results: `--bg-hover` on highlight/hover
- Section labels: `--text-placeholder`
- Result text: `--text-primary` for title, `--text-secondary` for metadata
- Replace all `hover:bg-gray-50` with `--bg-hover`

**Step 2:** Verify build, commit: `git commit -m "feat: restyle search overlay for dark mode"`

---

### Task 12: Restyle create-week modal

**Files:**
- Modify: `src/components/modals/create-week-modal.tsx`

**Step 1:** Update modal:
- Backdrop: same as search
- Card: `--bg-card` bg, `--border-card` border
- Replace hardcoded `white`, `bg-gray-*`, `text-gray-*` throughout:
  - `background-color: 'white'` → `--bg-card`
  - `bg-gray-900 text-white` (create button) → `--accent-purple` bg, white text
  - `text-gray-500` → `--text-secondary`
  - `text-gray-300` → `--text-placeholder`
  - `border-gray-200` → `--border-card`
- Checkboxes: accent `--accent-purple`
- Cancel button: ghost style, `--text-secondary`

**Step 2:** Verify build, commit: `git commit -m "feat: restyle create-week modal for dark mode"`

---

## Phase 6: Shared, Auth, Loading, Error

### Task 13: Restyle shared components and remaining pages

**Files:**
- Modify: `src/components/shared/inline-edit.tsx` (line 111: `text-gray-300`)
- Modify: `src/components/shared/markdown-render.tsx` (lines 14, 27: link colors)
- Modify: `src/components/granola/granola-sync-button.tsx` (line 88: button styles)
- Modify: `src/app/login/login-form.tsx` (lines 25, 29: error and button)
- Modify: `src/app/error.tsx` (lines 19, 25: buttons)
- Modify: `src/app/week/[weekStart]/error.tsx` (line 16: button)
- Modify: `src/app/week/[weekStart]/loading.tsx` (lines 5-40: skeleton colors)

**Step 1:** Replace all Tailwind gray/blue classes with CSS var equivalents:
- `text-gray-300` → `--text-placeholder`
- `text-gray-400` → `--text-placeholder`
- `text-gray-500` → `--text-secondary`
- `text-blue-600` → `--accent-purple`
- `hover:bg-gray-100` → inline `--bg-hover`
- `hover:bg-gray-50` → inline `--bg-hover`
- `bg-gray-200 animate-pulse` → `bg-[var(--border-card)] animate-pulse` (loading skeletons)
- `bg-gray-900 text-white` → `--accent-purple` bg, `#fff` text (primary buttons)
- `border-gray-300` → `--border-card`

**Step 2:** Update login-form:
- Centered card on `--bg-page` background
- `--bg-card` card, `--border-card` border
- Error: red stays (#dc2626)

**Step 3:** Update loading.tsx skeleton:
- Background: `--bg-page`
- Skeleton rectangles: `--border-card` bg with `animate-pulse`
- Card outlines: `--bg-card` bg, `--border-card` border

**Step 4:** Verify build, commit: `git commit -m "feat: restyle shared components, auth, and loading for dark mode"`

---

## Phase 7: Final Polish

### Task 14: Visual review and fixes

**Step 1:** Run `npx next build` — confirm clean.

**Step 2:** Start dev server (`npx next dev`), navigate every page:
- Login page
- Week view (Notes tab) — all 5 day cards
- Week view (Tasks tab) — kanban board with all 4 columns
- Create week modal
- Search overlay (Cmd+K)
- Task detail panel (click a card)
- Calendar picker
- Granola sync button

**Step 3:** Fix any visual issues found (inconsistent colors, hard-to-read text, missed hardcoded colors).

**Step 4:** Commit fixes: `git commit -m "fix: visual polish pass after dark mode migration"`

---

## Files Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `src/app/globals.css` | Replace tokens + font |
| 1 | `src/app/layout.tsx` | Update font family |
| 1 | `src/lib/constants.ts` | Remove status accent colors |
| 2 | `src/components/kanban/kanban-column.tsx` | Dark column styling |
| 2 | `src/components/kanban/kanban-card.tsx` | Compact dark cards |
| 2 | `src/components/kanban/kanban-board.tsx` | Dark overlay + detail panel state |
| 2 | `src/components/kanban/add-task-inline.tsx` | Dark styling |
| 2 | `src/components/kanban/meeting-tag-input.tsx` | Dark dropdown |
| 2 | `src/components/kanban/task-detail-panel.tsx` | **CREATE** |
| 2 | `supabase/migrations/*_add_task_description.sql` | **CREATE** |
| 2 | `src/lib/types/database.ts` | Add description field |
| 3 | `src/components/layout/header.tsx` | Ghost buttons, dark tabs |
| 3 | `src/components/layout/week-nav.tsx` | Dark ghost buttons |
| 3 | `src/components/layout/calendar-picker.tsx` | Dark picker |
| 4 | `src/components/layout/day-card.tsx` | Dark cards |
| 4 | `src/components/layout/day-cards.tsx` | Dark container |
| 4 | `src/components/meetings/meetings-cell.tsx` | Dark styling |
| 4 | `src/components/meetings/meeting-item.tsx` | Dark rows |
| 4 | `src/components/notes/notes-cell.tsx` | Dark editor |
| 4 | `src/components/notes/note-toolbar.tsx` | Dark toolbar |
| 5 | `src/components/layout/search-command.tsx` | Dark overlay |
| 5 | `src/components/modals/create-week-modal.tsx` | Dark modal |
| 6 | `src/components/shared/inline-edit.tsx` | Dark text |
| 6 | `src/components/shared/markdown-render.tsx` | Dark links |
| 6 | `src/components/granola/granola-sync-button.tsx` | Dark button |
| 6 | `src/app/login/login-form.tsx` | Dark login |
| 6 | `src/app/error.tsx` | Dark error |
| 6 | `src/app/week/[weekStart]/error.tsx` | Dark error |
| 6 | `src/app/week/[weekStart]/loading.tsx` | Dark skeleton |
| 7 | Various | Visual fixes |

**Total: 29 files modified, 2 files created, 14 tasks, ~7 phases**
