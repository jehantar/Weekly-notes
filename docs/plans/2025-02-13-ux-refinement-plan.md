# UX Refinement Implementation Plan: "Refined Monospace" Day Cards

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the spreadsheet grid with a day-card layout, add warm visual styling with JetBrains Mono, transitions/animations, and fix usability gaps.

**Architecture:** Pure frontend changes — no DB schema, no API, no state logic changes. The WeekProvider and all CRUD mutations are unchanged. We replace the grid layout component, restyle cells as card sections, add a command-palette search, and layer on CSS transitions + animations.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, TipTap, date-fns, react-day-picker, sonner

---

### Task 1: Foundation — Global Styles, Font, Color Tokens

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Add JetBrains Mono and CSS custom properties to globals.css**

Add Google Fonts import and CSS variables at the top of `globals.css`, before the TipTap styles:

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
@import "tailwindcss";

/* Design tokens */
:root {
  --bg-page: #f8f7f5;
  --bg-card: #ffffff;
  --border-card: #e5e3df;
  --accent-purple: #8b7ec8;
  --text-primary: #1a1a1a;
  --text-secondary: #6b6560;
  --text-placeholder: #a8a29e;
}
```

**Step 2: Update layout.tsx to use new font and background**

Change the body className from:
```tsx
className="bg-white text-gray-900 font-mono text-sm antialiased"
```
to:
```tsx
className="text-sm antialiased"
style={{ fontFamily: "'JetBrains Mono', monospace", backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
```

**Step 3: Verify the app still loads**

Run: `npm run dev`
Expected: App loads with warm off-white background and JetBrains Mono font. Everything else still works.

**Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add JetBrains Mono font and warm color tokens"
```

---

### Task 2: Day Cards Layout — Replace the Grid

**Files:**
- Create: `src/components/layout/day-cards.tsx`
- Create: `src/components/layout/day-card.tsx`
- Modify: `src/app/week/[weekStart]/week-client.tsx`
- Modify: `src/lib/utils/dates.ts` (add `isToday` helper)

**Step 1: Add isToday helper to dates.ts**

```typescript
import { isToday as isTodayFns, addDays } from "date-fns";

/** Check if a specific day-of-week in a given week is today */
export function isDayToday(monday: Date, dayOfWeek: number): boolean {
  return isTodayFns(addDays(monday, dayOfWeek - 1));
}
```

**Step 2: Create day-card.tsx — a single day column**

```tsx
"use client";

import { addDays, format } from "date-fns";
import { isDayToday } from "@/lib/utils/dates";
import { DAY_LABELS } from "@/lib/constants";
import { MeetingsCell } from "@/components/meetings/meetings-cell";
import { ActionItemsCell } from "@/components/action-items/action-items-cell";
import { NotesCell } from "@/components/notes/notes-cell";

export function DayCard({
  monday,
  dayOfWeek,
  index,
}: {
  monday: Date;
  dayOfWeek: number;
  index: number;
}) {
  const isToday = isDayToday(monday, dayOfWeek);
  const date = addDays(monday, dayOfWeek - 1);
  const dayName = DAY_LABELS[dayOfWeek - 1];
  const dateNum = format(date, "d");
  const monthDay = format(date, "M/d");

  return (
    <div
      className="flex flex-col min-w-0 flex-1 border bg-[var(--bg-card)] overflow-y-auto transition-all duration-200"
      style={{
        borderColor: isToday ? 'var(--accent-purple)' : 'var(--border-card)',
        borderTopWidth: isToday ? '2px' : '1px',
        boxShadow: isToday
          ? '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)'
          : '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        maxHeight: '75vh',
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Day Header */}
      <div
        className="px-3 py-2 border-b flex items-baseline gap-2"
        style={{ borderColor: 'var(--border-card)' }}
      >
        <span className="text-lg font-bold" style={{ color: isToday ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
          {dateNum}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {dayName}
        </span>
      </div>

      {/* Meetings Section */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-placeholder)' }}>
          Meetings
        </div>
        <MeetingsCell dayOfWeek={dayOfWeek} />
      </div>

      {/* Action Items Section */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-placeholder)' }}>
          Action Items
        </div>
        <ActionItemsCell dayOfWeek={dayOfWeek} />
      </div>

      {/* Notes Section */}
      <div className="px-3 py-2 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-placeholder)' }}>
          Notes
        </div>
        <NotesCell dayOfWeek={dayOfWeek} />
      </div>
    </div>
  );
}
```

**Step 3: Create day-cards.tsx — the 5-card container**

```tsx
"use client";

import { DAYS_OF_WEEK } from "@/lib/constants";
import { DayCard } from "./day-card";

export function DayCards({ monday }: { monday: Date }) {
  return (
    <div className="flex gap-3 h-full">
      {DAYS_OF_WEEK.map((day, i) => (
        <DayCard key={day} monday={monday} dayOfWeek={day} index={i} />
      ))}
    </div>
  );
}
```

**Step 4: Update week-client.tsx to use DayCards instead of WeekGrid**

Replace the `WeekGrid` import and usage:

```tsx
import { DayCards } from "@/components/layout/day-cards";
// Remove: import { WeekGrid } from "@/components/grid/week-grid";
```

And in the JSX, replace:
```tsx
<main className="flex-1 p-4">
  <WeekGrid monday={monday} />
</main>
```
with:
```tsx
<main className="flex-1 p-4 overflow-hidden">
  <DayCards monday={monday} />
</main>
```

**Step 5: Remove grid cell styling from MeetingsCell, ActionItemsCell, NotesCell**

In `meetings-cell.tsx`, change the outer div from:
```tsx
<div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
```
to:
```tsx
<div className="text-xs">
```

In `action-items-cell.tsx`, same change — remove the border/padding/min-height wrapper:
```tsx
<div className="text-xs">
```

In `notes-cell.tsx`, change from:
```tsx
<div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
```
to:
```tsx
<div className="text-xs">
```

**Step 6: Verify the day cards layout renders**

Run: `npm run dev`
Expected: 5 side-by-side day cards with sections. Today's card has a purple top border. Content works as before.

**Step 7: Commit**

```bash
git add src/components/layout/day-cards.tsx src/components/layout/day-card.tsx src/app/week/[weekStart]/week-client.tsx src/lib/utils/dates.ts src/components/meetings/meetings-cell.tsx src/components/action-items/action-items-cell.tsx src/components/notes/notes-cell.tsx
git commit -m "feat: replace spreadsheet grid with day-card layout"
```

---

### Task 3: Header Redesign — Today Button, Warm Styling, Transitions

**Files:**
- Modify: `src/components/layout/header.tsx`
- Modify: `src/components/layout/week-nav.tsx`
- Modify: `src/components/layout/calendar-picker.tsx`
- Modify: `src/components/granola/granola-sync-button.tsx`

**Step 1: Add "Today" button and warm styling to header.tsx**

Update the header's className and add transition classes:
```tsx
<header className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-card)' }}>
```

**Step 2: Add "Today" button to week-nav.tsx**

Add a "Today" button between the nav arrows and the week label (or after Next). Import `getCurrentWeekStart` from dates.ts. The button navigates to `/week/${getCurrentWeekStart()}`:

```tsx
<button
  onClick={() => router.push(`/week/${getCurrentWeekStart()}`)}
  className="px-2 py-1 text-xs transition-colors duration-150 hover:bg-gray-100"
  style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
>
  Today
</button>
```

**Step 3: Add transition classes to all nav buttons**

Add `transition-colors duration-150` to Prev, Next, Cal, Search, and Granola buttons. Remove `rounded` from the Granola sync button for consistency.

**Step 4: Update calendar-picker.tsx dropdown styling**

Change the dropdown border to use warm colors:
```tsx
style={{ border: '1px solid var(--border-card)' }}
className="absolute right-0 top-full mt-1 z-50 bg-[var(--bg-card)] shadow-lg"
```

**Step 5: Fix Granola button — remove `rounded`**

In `granola-sync-button.tsx`, change:
```tsx
className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
```
to:
```tsx
className="text-sm px-3 py-1 border hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
style={{ borderColor: 'var(--border-card)' }}
```

**Step 6: Verify header changes**

Run: `npm run dev`
Expected: Header has warm borders, Today button works, all buttons have smooth hover transitions.

**Step 7: Commit**

```bash
git add src/components/layout/header.tsx src/components/layout/week-nav.tsx src/components/layout/calendar-picker.tsx src/components/granola/granola-sync-button.tsx
git commit -m "feat: redesign header with Today button and warm styling"
```

---

### Task 4: Search Command Palette

**Files:**
- Create: `src/components/layout/search-command.tsx`
- Modify: `src/components/layout/header.tsx`
- Modify: `src/app/week/[weekStart]/week-client.tsx`

**Step 1: Create search-command.tsx — command palette overlay**

Build a centered overlay search component that:
- Renders a fixed overlay with backdrop blur (`bg-black/20 backdrop-blur-sm`)
- Has a centered search box (max-w-lg, top-1/3 of screen)
- Input auto-focuses on open
- Results render below the input, grouped by week (reuse existing search logic from SearchBar)
- Closes on Escape or click-outside
- Fades in with `animate-in` (simple opacity transition)

The search logic (Supabase RPC, debounce, grouping) is copied from the existing `search-bar.tsx` — this is a presentation-layer rewrite, not a logic change.

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { SEARCH_DEBOUNCE, DAY_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";

type SearchResult = {
  item_type: string;
  item_id: string;
  week_id: string;
  week_start: string;
  day_of_week: number;
  content: string;
  rank: number;
};

export function SearchCommand({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)("search_all", {
        search_query: q,
        user_id_param: user.id,
      });
      setResults((data as SearchResult[]) ?? []);
      setLoading(false);
    },
    [supabase]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), SEARCH_DEBOUNCE);
  };

  const handleResultClick = (result: SearchResult) => {
    router.push(`/week/${result.week_start}`);
    onClose();
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.week_start;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          animation: 'fadeSlideIn 150ms ease-out',
        }}
      >
        <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--text-placeholder)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search across all weeks..."
            className="flex-1 outline-none bg-transparent text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'var(--border-card)', color: 'var(--text-placeholder)' }}>ESC</kbd>
        </div>

        {(results.length > 0 || loading) && (
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-placeholder)' }}>
                Searching...
              </div>
            )}
            {Object.entries(grouped).map(([weekStart, items]) => (
              <div key={weekStart}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-placeholder)', backgroundColor: 'var(--bg-page)' }}>
                  Week of {format(parseISO(weekStart), "M/d/yyyy")}
                </div>
                {items.map((item) => (
                  <button
                    key={item.item_id}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50 transition-colors duration-100"
                    style={{ borderBottom: '1px solid var(--border-card)' }}
                  >
                    <span className="mr-2" style={{ color: 'var(--text-placeholder)' }}>
                      {item.item_type === "meeting" ? "Meeting" : item.item_type === "action_item" ? "Action" : "Note"}
                    </span>
                    <span className="mr-2" style={{ color: 'var(--text-placeholder)' }}>
                      {DAY_LABELS[item.day_of_week - 1]}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {item.content.slice(0, 80)}{item.content.length > 80 ? "..." : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-placeholder)' }}>
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Add fadeSlideIn keyframes to globals.css**

```css
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Step 3: Wire up search in header.tsx and week-client.tsx**

Add search state to `week-client.tsx`:
```tsx
const [searchOpen, setSearchOpen] = useState(false);
```

Add `Cmd+K` / `/` keyboard listener in `week-client.tsx`:
```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
      e.preventDefault();
      setSearchOpen(true);
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, []);
```

Pass `onSearchOpen` to Header, render SearchCommand when open:
```tsx
<Header weekStart={weekStart} monday={monday} onSearchOpen={() => setSearchOpen(true)} />
{searchOpen && <SearchCommand onClose={() => setSearchOpen(false)} />}
```

Update Header to accept and use `onSearchOpen`:
```tsx
export function Header({ weekStart, monday, onSearchOpen }: { weekStart: string; monday: Date; onSearchOpen: () => void }) {
```

Replace the SearchBar component with a simple button that calls `onSearchOpen`:
```tsx
<button
  onClick={onSearchOpen}
  className="px-2 py-1 text-sm flex items-center gap-1.5 transition-colors duration-150 hover:bg-gray-100"
  style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
>
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
  <span>Search</span>
  <kbd className="text-[10px] ml-1" style={{ color: 'var(--text-placeholder)' }}>⌘K</kbd>
</button>
```

Remove the SearchBar import from header.tsx.

**Step 4: Verify search works**

Run: `npm run dev`
Expected: Clicking Search or pressing Cmd+K opens centered palette. Typing searches. Clicking result navigates. Esc closes.

**Step 5: Commit**

```bash
git add src/components/layout/search-command.tsx src/components/layout/header.tsx src/app/week/[weekStart]/week-client.tsx src/app/globals.css
git commit -m "feat: replace inline search with command palette (Cmd+K)"
```

---

### Task 5: Micro-interactions — Transitions, Hover States, Animations

**Files:**
- Modify: `src/components/meetings/meeting-item.tsx`
- Modify: `src/components/action-items/action-item.tsx`
- Modify: `src/components/notes/notes-cell.tsx`
- Modify: `src/components/notes/note-toolbar.tsx`
- Modify: `src/app/globals.css`

**Step 1: Add transition classes to meeting-item.tsx**

On the delete button, add transition:
```tsx
className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs ml-1 shrink-0"
```

**Step 2: Add checkbox animation and transitions to action-item.tsx**

On the delete/priority container:
```tsx
className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
```

Add a CSS class for the checkbox checkmark animation. In the SVG inside the checkbox button, add:
```tsx
className="w-2 h-2 text-white"
style={{ animation: 'checkPop 200ms ease-out' }}
```

**Step 3: Add checkPop keyframe to globals.css**

```css
@keyframes checkPop {
  0% { transform: scale(0); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

**Step 4: Add toolbar fade to note-toolbar.tsx and notes-cell.tsx**

Wrap the NoteToolbar in a div with fade transition in notes-cell.tsx:
```tsx
{focused && editor && (
  <div style={{ animation: 'fadeSlideIn 150ms ease-out' }}>
    <NoteToolbar editor={editor} />
  </div>
)}
```

**Step 5: Verify animations**

Run: `npm run dev`
Expected: Checkbox has pop animation. Delete buttons fade in/out smoothly. Toolbar fades in. Hover states transition smoothly.

**Step 6: Commit**

```bash
git add src/components/meetings/meeting-item.tsx src/components/action-items/action-item.tsx src/components/notes/notes-cell.tsx src/components/notes/note-toolbar.tsx src/app/globals.css
git commit -m "feat: add micro-interactions and transition animations"
```

---

### Task 6: Usability — Empty States, Add Button Visibility, Keyboard Nav

**Files:**
- Modify: `src/components/meetings/meetings-cell.tsx`
- Modify: `src/components/action-items/action-items-cell.tsx`
- Modify: `src/app/week/[weekStart]/week-client.tsx`

**Step 1: Hide add buttons by default, show on hover**

The day-card already has a `group` class (we need to add it to the card container in `day-card.tsx`). Add `group` to the outer div of `DayCard`.

In `meetings-cell.tsx`, change the add button:
```tsx
<button
  onClick={handleAdd}
  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-xs"
  style={{ color: 'var(--text-placeholder)' }}
>
  + Add meeting
</button>
```

In `action-items-cell.tsx`, same pattern:
```tsx
<button
  onClick={handleAdd}
  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-xs"
  style={{ color: 'var(--text-placeholder)' }}
>
  + Add item
</button>
```

**Step 2: Add empty state message for empty cells**

In `meetings-cell.tsx`, when `dayMeetings.length === 0`, show:
```tsx
{dayMeetings.length === 0 && (
  <p className="text-center py-2 text-[10px]" style={{ color: 'var(--text-placeholder)' }}>
    No meetings
  </p>
)}
```

Same for `action-items-cell.tsx`:
```tsx
{dayItems.length === 0 && (
  <p className="text-center py-2 text-[10px]" style={{ color: 'var(--text-placeholder)' }}>
    No items
  </p>
)}
```

**Step 3: Add arrow key week navigation to week-client.tsx**

```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const target = addWeeksUtil(monday, -1);
      router.push(`/week/${formatWeekStart(target)}`);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const target = addWeeksUtil(monday, 1);
      router.push(`/week/${formatWeekStart(target)}`);
    }
  }
  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [monday, router]);
```

Import `addWeeks` and `formatWeekStart` from dates.ts (rename import to avoid conflict):
```tsx
import { parseWeekStart, addWeeks as addWeeksUtil, formatWeekStart } from "@/lib/utils/dates";
```

**Step 4: Verify usability improvements**

Run: `npm run dev`
Expected: Empty days show placeholder text. Add buttons only appear on card hover. Arrow keys navigate weeks.

**Step 5: Commit**

```bash
git add src/components/layout/day-card.tsx src/components/meetings/meetings-cell.tsx src/components/action-items/action-items-cell.tsx src/app/week/[weekStart]/week-client.tsx
git commit -m "feat: add empty states, hover-reveal add buttons, keyboard nav"
```

---

### Task 7: Modal Depth and Loading Skeleton

**Files:**
- Modify: `src/components/modals/create-week-modal.tsx`
- Modify: `src/components/modals/carryover-modal.tsx`
- Modify: `src/app/week/[weekStart]/loading.tsx`

**Step 1: Update modal backdrops and panels**

In both `create-week-modal.tsx` and `carryover-modal.tsx`, change the overlay:
```tsx
<div className="fixed inset-0 flex items-center justify-center z-50"
  style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
```

Change the modal panel:
```tsx
<div className="p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
```

Apply same warm border treatment to buttons inside modals.

**Step 2: Rewrite loading.tsx for day-card skeleton**

```tsx
export default function Loading() {
  const days = [1, 2, 3, 4, 5];

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Header skeleton */}
      <header className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-card)' }}>
        <div className="flex items-center gap-3">
          <div className="h-7 w-16 bg-gray-200 animate-pulse" />
          <div className="h-5 w-[140px] bg-gray-200 animate-pulse" />
          <div className="h-7 w-16 bg-gray-200 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-7 w-14 bg-gray-200 animate-pulse" />
          <div className="h-7 w-20 bg-gray-200 animate-pulse" />
        </div>
      </header>

      {/* Day cards skeleton */}
      <div className="flex-1 p-4">
        <div className="flex gap-3">
          {days.map((d) => (
            <div
              key={d}
              className="flex-1 min-w-0"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
            >
              {/* Day header skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="flex items-baseline gap-2">
                  <div className="h-5 w-6 bg-gray-200 animate-pulse" />
                  <div className="h-3 w-8 bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Meetings skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="h-2.5 w-14 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="h-3 w-3/4 bg-gray-200 animate-pulse" />
                  <div className="h-3 w-1/2 bg-gray-200 animate-pulse" />
                </div>
              </div>
              {/* Action items skeleton */}
              <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-card)' }}>
                <div className="h-2.5 w-20 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-full shrink-0" />
                    <div className="h-3 w-2/3 bg-gray-200 animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 bg-gray-200 animate-pulse rounded-full shrink-0" />
                    <div className="h-3 w-1/2 bg-gray-200 animate-pulse" />
                  </div>
                </div>
              </div>
              {/* Notes skeleton */}
              <div className="px-3 py-2">
                <div className="h-2.5 w-10 bg-gray-100 animate-pulse mb-2" />
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-gray-200 animate-pulse" />
                  <div className="h-3 w-4/5 bg-gray-200 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Verify modals and skeleton**

Run: `npm run dev`
Expected: Loading state shows 5 card skeletons. Modals have backdrop blur and shadow depth.

**Step 4: Commit**

```bash
git add src/components/modals/create-week-modal.tsx src/components/modals/carryover-modal.tsx src/app/week/[weekStart]/loading.tsx
git commit -m "feat: add modal depth and day-card loading skeleton"
```

---

### Task 8: Cleanup — Remove Old Grid Components, Final Polish

**Files:**
- Delete: `src/components/grid/week-grid.tsx`
- Delete: `src/components/grid/day-header.tsx`
- Delete: `src/components/grid/row-label.tsx`
- Delete: `src/components/layout/search-bar.tsx`
- Modify: `src/app/week/[weekStart]/week-client.tsx` (remove any stale imports)

**Step 1: Delete unused files**

```bash
rm src/components/grid/week-grid.tsx
rm src/components/grid/day-header.tsx
rm src/components/grid/row-label.tsx
rm src/components/layout/search-bar.tsx
```

**Step 2: Verify no broken imports**

Run: `npm run build`
Expected: Build succeeds with no errors. No references to deleted files.

**Step 3: Visual QA pass**

Run: `npm run dev` and verify:
- [ ] 5 day cards render side by side
- [ ] Today's card has purple top border
- [ ] JetBrains Mono font is loaded
- [ ] Warm off-white background
- [ ] Section labels are uppercase + letter-spaced
- [ ] Meetings, action items, notes all editable
- [ ] Enter/Backspace chaining works
- [ ] Checkbox animation on toggle
- [ ] Delete buttons fade in on hover
- [ ] Add buttons fade in on card hover
- [ ] Empty days show placeholder text
- [ ] Cmd+K opens search palette
- [ ] Arrow keys navigate weeks
- [ ] Today button navigates to current week
- [ ] Calendar picker works with warm styling
- [ ] Modals have shadow + backdrop blur
- [ ] Loading skeleton matches card layout
- [ ] Granola sync button has no border-radius

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old grid components and search bar"
```

---

## Summary

| Task | Description | Files | Estimated Steps |
|------|-------------|-------|-----------------|
| 1 | Foundation: font + color tokens | 2 | 4 |
| 2 | Day Cards layout | 7 | 7 |
| 3 | Header redesign | 4 | 7 |
| 4 | Search command palette | 4 | 5 |
| 5 | Micro-interactions | 5 | 6 |
| 6 | Usability: empty states, hover, keyboard | 4 | 5 |
| 7 | Modal depth + loading skeleton | 3 | 4 |
| 8 | Cleanup + QA | 5 | 4 |

**Total: 8 tasks, ~42 steps, 8 commits**

Each task produces a working, committable state. Tasks 1-2 are the foundation. Tasks 3-7 are independent improvements that build on the new layout. Task 8 is cleanup.
