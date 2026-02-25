# Linear-Inspired Full App Redesign

**Date:** 2026-02-24
**Scope:** Full app — global design system, kanban board, day cards, header, modals
**Direction:** Pure Linear clone — dark mode, Inter font, monochrome + purple accent, maximum restraint

---

## 1. Global Design System

### Font
- **Inter** (Google Fonts) — Inter Display for headings (semibold/bold), Inter for body
- Replace JetBrains Mono entirely
- Keep the boxy (no border-radius) identity — this works well in dark mode

### Color Tokens
```css
:root {
  --bg-page:        #0F0F11;
  --bg-card:        #1B1C1E;
  --bg-column:      #161618;
  --bg-hover:       #232428;
  --border-card:    #2A2B2E;
  --accent-purple:  #848CD0;
  --text-primary:   #ECECED;
  --text-secondary: #8B8C90;
  --text-placeholder: #4E4F54;
}
```

### Shadows
- Cards: `0 0 0 1px var(--border-card)` (border-as-shadow, not box-shadow)
- Drag overlay: `0 8px 24px -4px rgb(0 0 0 / 0.4)` (subtle glow)
- Remove `--shadow-card`, `--shadow-card-hover` — not needed in dark mode

### Interactions
- Hover: background shift to `--bg-hover`, not border/shadow changes
- Transitions: 100ms ease-out (snappier)
- Focus: purple outline ring (`--accent-purple`)

---

## 2. Kanban Board

### Columns
- Background: `--bg-column` (barely different from page)
- No accent top lines, no borders — columns defined purely by content grouping
- Headers: small colored status circle + label + count as plain text
  - Text: 12px, medium weight, `--text-secondary`
  - No count chip — just the number
- Add button: hover-reveal `+` icon on column, or `n` shortcut
- Collapsed Done: restyle current strip for dark mode (dark bg, light text)

### Cards
- Compact: `px-3 py-2`
- Background: `transparent` default, `--bg-hover` on hover
- Border: `1px solid var(--border-card)` (barely visible)
- No priority stripes — priority is a small colored dot after the title
- Layout: `[Title]  [#meeting] [dot] [x]` — single line, truncate title
- Delete: hover-reveal `x`, `--text-placeholder` color, red on hover

### Card Layout
```
┌─────────────────────────────────────────────┐
│ Title text that truncates...  #mtg  ●  ×   │
└─────────────────────────────────────────────┘
```

### Drag & Drop
- Ghost: opacity 0.3, dashed border (adapt to dark colors)
- Overlay: shadow glow + slight rotation, purple border, `--bg-card` background
- Drop zone: subtle `--accent-purple` 8% tint on column

### Detail Panel (NEW)
- Slides in from right, 400px wide, `--bg-card` background
- Trigger: click card (not on text) OR `Space` on focused card
- Close: `Escape` or click outside
- Contents:
  - Title: large, editable inline
  - Status: dropdown with colored status circles
  - Priority: dropdown (Low/Medium/High)
  - Meeting: link selector (reuse MeetingTagInput logic)
  - Description: textarea/markdown for notes about the task (new field)
  - Footer: created date, completed date
- Click specifically on text: inline rename (preserves current fast-edit)

---

## 3. Day Cards (Weekly Notes View)

### Layout
- 5 vertical columns (Mon-Fri) — same structure
- Card background: `--bg-card`
- Border: `1px solid var(--border-card)`
- Day header: number large (20px, `--text-primary`), name small (11px, `--text-secondary`)

### Meetings Section
- Compact rows: small purple dot + title
- Hover: `--bg-hover` row highlight
- Granola summary: `--text-secondary`, slightly indented below title
- Add meeting: hover-reveal `+`

### Notes Section
- TipTap editor: transparent background (blends into card)
- Toolbar: appears on focus, `--text-secondary` icons, `--bg-hover` on active
- Placeholder: `--text-placeholder`

### Dividers
- Thin 1px `--border-card` line between meetings and notes
- No section labels — content type is self-evident

---

## 4. Header & Navigation

- Background: `--bg-page` (no distinct header bar)
- Week label: semibold, `--text-primary`
- Nav buttons: ghost style — transparent bg, `--text-secondary`, `--bg-hover` on hover
- Tab switcher: underline indicator in `--accent-purple` on active, `--text-secondary` inactive
- Search: subtle icon + `Cmd+K` hint
- Granola sync: ghost button style

---

## 5. Modals & Overlays

### Search (Cmd+K)
- Dark overlay with blur
- Modal: `--bg-card` bg, `--border-card` border
- Input: transparent bg, large text, `--text-primary`
- Results: rows with `--bg-hover` on highlight

### Create Week Modal
- Dark card treatment
- Checkboxes: `--accent-purple` when checked
- Template columns: mini day cards in dark style

---

## 6. Files Impact

### Global
- `src/app/globals.css` — New color tokens, font import, remove old tokens
- `src/app/layout.tsx` — Update font reference
- `src/lib/constants.ts` — Update status accent colors (or remove)

### Kanban
- `src/components/kanban/kanban-board.tsx` — Dark drag overlay, detail panel state
- `src/components/kanban/kanban-column.tsx` — Minimal column chrome, dark styling
- `src/components/kanban/kanban-card.tsx` — Compact layout, priority after title, transparent bg
- `src/components/kanban/add-task-inline.tsx` — Dark styling
- `src/components/kanban/meeting-tag-input.tsx` — Dark dropdown
- **NEW:** `src/components/kanban/task-detail-panel.tsx` — Side panel component

### Day Cards
- `src/components/layout/day-card.tsx` — Dark card styling
- `src/components/layout/day-cards.tsx` — Dark container
- `src/components/layout/header.tsx` — Ghost buttons, dark tabs
- `src/components/meetings/meetings-cell.tsx` — Dark row styling
- `src/components/meetings/meeting-item.tsx` — Dark compact rows
- `src/components/notes/notes-cell.tsx` — Transparent editor, dark toolbar
- `src/components/notes/note-toolbar.tsx` — Dark button styling

### Modals
- `src/components/layout/search-command.tsx` — Dark overlay + modal
- `src/components/modals/create-week-modal.tsx` — Dark card + checkboxes

### Auth
- `src/app/login/login-form.tsx` — Dark login page

### Shared
- `src/components/shared/inline-edit.tsx` — Dark input styling

### Database (optional)
- Tasks table: add `description` column for the detail panel notes field
