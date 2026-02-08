# Weekly Notes Tracker - Implementation Progress

## Phase 0: Scaffold & Auth
- [x] Project scaffolded with Next.js 16, React 19, TypeScript
- [x] All deps installed (Supabase, Tailwind v4, date-fns, react-day-picker, react-markdown, sonner)
- [x] Supabase client files (browser, server, middleware)
- [x] Auth middleware for route protection
- [x] Login page with Google OAuth
- [x] OAuth callback route
- [x] .env.example template
- [x] SQL migrations (schema + search function)

## Phase 1: Data Layer & Week Navigation
- [x] Date utilities (getMonday, formatWeekStart, formatDayHeader, etc.)
- [x] Root page.tsx redirect to current week
- [x] Week page Server Component (fetches all data in parallel)
- [x] WeekProvider context with all data + mutation functions
- [x] WeekClient shell
- [x] Header with week navigation (prev/next arrows + label)
- [x] CSS Grid layout (6 cols: label + 5 days, 3 rows)

## Phase 2: Meetings
- [x] InlineEdit reusable component (click-to-edit + autosave)
- [x] MarkdownInline/MarkdownBlock renderers
- [x] MeetingsCell, MeetingItem, add-meeting button
- [x] CRUD mutations in WeekProvider (add, update, delete)
- [x] Undo toast for deleted meetings (5s delayed-delete)

## Phase 3: Action Items
- [x] ActionItemsCell with priority auto-sort
- [x] ActionItem component (checkbox, inline edit, priority tints)
- [x] PriorityPicker (click to cycle, right-click for menu)
- [x] Priority utilities (sort, label, bg color)
- [x] CRUD mutations (add, update, delete, toggleDone, setPriority)

## Phase 4: Notes
- [x] NotesCell with view/edit modes
- [x] Auto-resizing textarea with Tab indentation
- [x] Block-level markdown rendering
- [x] Upsert mutation (create on first edit, update on changes)

## Phase 5: Meeting Tags
- [x] TagAutocomplete (# detection, dropdown of day's meetings)
- [x] MeetingTag pill/chip rendering
- [x] Live-update: meeting rename propagates to action item #tags
- [x] Cleanup: meeting delete strips #tags from action items

## Phase 6: Week Creation & Carryover
- [x] CreateWeekModal (clone meetings from previous week, check/uncheck/add/move)
- [x] CarryoverModal (select incomplete items, assign days)
- [x] Navigation integration (auto-show modal when week doesn't exist)
- [x] Blank-week fallback

## Phase 7: Search
- [x] search_all PostgreSQL function with websearch_to_tsquery
- [x] SearchBar with 300ms debounce
- [x] Results dropdown grouped by week
- [x] Click-to-navigate

## Phase 8: Calendar Picker & Polish
- [x] CalendarPicker with react-day-picker
- [x] Utilitarian aesthetic (thin borders, mono font, no rounded corners)
- [x] Empty states for all cells

## Remaining To-Do
- [x] Configure Supabase project and run migrations
- [x] Test end-to-end with real Supabase instance
- [x] Add loading skeletons
- [ ] Handle edge cases (invalid URLs, session expiry)
- [ ] Visual polish pass (verify against template.jpeg)
