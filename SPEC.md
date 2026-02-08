# Weekly Notes Tracker - Technical Specification

## Overview

A single-user web application for tracking weekly meetings, action items, and notes in a structured Mon-Fri grid layout. Replaces a Google Sheets workflow with a purpose-built tool that adds auto-save, action item carryover, search, and meeting templating.

---

## Tech Stack

| Layer         | Technology                     |
|---------------|--------------------------------|
| Frontend      | Next.js (React)                |
| Styling       | TBD (Tailwind recommended)     |
| Database      | Supabase (PostgreSQL)          |
| Auth          | Supabase Auth (Google OAuth)   |
| Hosting       | TBD (should be deployable anywhere - Vercel, VPS, etc.) |

- **Desktop only** - no mobile/tablet responsive design required.
- **Single user** - no multi-user, team, or sharing features.

---

## Data Model

### Supabase Schema

```sql
-- Users table (managed by Supabase Auth, referenced here for FK)
-- Supabase Auth creates auth.users automatically via Google OAuth

-- Weeks
CREATE TABLE weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Always a Monday
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Meetings
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5), -- 1=Mon, 5=Fri
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Action Items
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  content TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  priority SMALLINT NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 2), -- 0=low, 1=medium, 2=high
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL, -- Optional link
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notes
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 5),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_weeks_user_start ON weeks(user_id, week_start);
CREATE INDEX idx_meetings_week_day ON meetings(week_id, day_of_week);
CREATE INDEX idx_action_items_week_day ON action_items(week_id, day_of_week);
CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_notes_week_day ON notes(week_id, day_of_week);

-- Full-text search index for cross-week search
CREATE INDEX idx_meetings_search ON meetings USING gin(to_tsvector('english', title));
CREATE INDEX idx_action_items_search ON action_items USING gin(to_tsvector('english', content));
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', content));

-- Row Level Security
ALTER TABLE weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: user can only access their own data
CREATE POLICY "Users can CRUD their own weeks"
  ON weeks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can CRUD meetings in their weeks"
  ON meetings FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD action items in their weeks"
  ON action_items FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

CREATE POLICY "Users can CRUD notes in their weeks"
  ON notes FOR ALL
  USING (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()))
  WITH CHECK (week_id IN (SELECT id FROM weeks WHERE user_id = auth.uid()));

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON weeks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON action_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### Entity Relationships

```
weeks 1───* meetings
weeks 1───* action_items
weeks 1───* notes
meetings 1───* action_items (optional link via meeting_id)
```

### Key Constraints

- `week_start` is always a Monday. The app computes this from any date.
- `day_of_week` is 1-5 (Monday-Friday). No weekends.
- `priority`: 0 = low (default), 1 = medium, 2 = high.
- Each week has at most one notes entry per day (enforced in application logic, or add a UNIQUE constraint on `(week_id, day_of_week)` for notes).

---

## Authentication

- **Google OAuth only** via Supabase Auth.
- Single-user app: after first login, the user's `auth.uid()` is the only identity.
- No registration flow, password management, or other auth methods.
- Supabase RLS policies ensure data isolation (future-proof if multi-user is ever added).

---

## UI Layout

### Overall Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  [← Prev]   Week of 2/2    [Next →]   [📅 Calendar]   [🔍 Search] │
├──────────┬──────────┬──────────┬──────────┬──────────┬──────────────┤
│          │ Mon 2/2  │ Tue 2/3  │ Wed 2/4  │ Thu 2/5  │   Fri 2/6   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│  Key     │ • Meet 1 │ • Meet 1 │ • Meet 1 │ • Meet 1 │  • Meet 1    │
│ Meetings │ • Meet 2 │          │ • Meet 2 │          │              │
│          │ • Meet 3 │          │          │          │              │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│  Action  │ ◉ Item 1 │ ○ Item 1 │ ◉ Item 1 │ ○ Item 1 │  ○ Item 1    │
│  Items   │ ○ Item 2 │ ○ Item 2 │ ○ Item 2 │ ○ Item 2 │              │
│          │ ○ Item 3 │          │          │ ○ Item 3 │              │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────────┤
│  Notes   │ Free-    │          │ Free-    │          │  Free-       │
│          │ form     │          │ form     │          │  form        │
│          │ text     │          │ text     │          │  text        │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘
```

### Grid Behavior

- **6 columns**: row label + 5 day columns (Mon-Fri).
- **3 rows**: Key Meetings, Action Items, Notes.
- **Expand and push**: When a cell has many items, it grows vertically. All cells in the same row stretch to match the tallest cell.
- **Inline editing**: Click any cell to edit directly in the grid (spreadsheet-like). No separate editing panel.

### Header Bar

- **Week label**: "Week of M/D" showing the Monday date.
- **Prev/Next arrows**: Navigate one week at a time. If the target week doesn't exist, prompt to create it.
- **Calendar picker**: A date picker widget that jumps to the week containing the selected date.
- **Search icon**: Opens a search input (see Search section).

### Aesthetic

- **Clean utilitarian**: Minimal, dense information display. Functional over pretty.
- Thin borders, clear typography, high contrast.
- No rounded corners, shadows, or decorative elements - spreadsheet-like.
- Monospace or system font for data cells.

---

## Feature Details

### 1. Meetings (Key Meetings Row)

- Displayed as a bulleted list within each day's cell.
- **Inline editing**: Click to add/edit meeting titles.
- **Minimal markdown**: Support `**bold**`, `*italic*`, and `[links](url)` in meeting titles, rendered inline.
- **Add button**: A `+` button or empty-state prompt at the bottom of each cell to add a new meeting.
- Meetings maintain a `sort_order` for manual arrangement (insertion order).

### 2. Action Items Row

- Displayed as a list with circular checkboxes (◉ = done, ○ = not done).
- **Toggle done/not done**: Click the circle to toggle completion.
- **Inline editing**: Click the text to edit the action item content.
- **Minimal markdown**: Same as meetings (`**bold**`, `*italic*`, `[links](url)`).

#### Priority System

- Each action item has a priority: **low** (default), **medium**, or **high**.
- **Visual treatment**: The entire action item row gets a subtle background tint:
  - Low = no background (default/transparent)
  - Medium = subtle warm/amber tint
  - High = subtle red/coral tint
- **Setting priority**: Right-click or a small dropdown/cycle button on the action item.
- **Auto-sort**: Items within a day are automatically sorted by priority (high at top, then medium, then low). Within the same priority, sort by insertion order.

#### Meeting Link (Inline Tag)

- Action items can optionally reference a meeting using `#meeting-name` syntax typed inline.
- The tag auto-completes against that day's meetings.
- Tags render as a distinct styled element (e.g., pill/chip) within the text.
- **Live link**: If a meeting is renamed, all `#tags` referencing it automatically update across action items.
- If a meeting is deleted, the tag in action items is also removed (cleaned up).

### 3. Notes Row

- Each day gets a single **multi-line text block**.
- Supports minimal markdown (`**bold**`, `*italic*`, `[links](url)`) plus:
  - Multiple lines / paragraphs.
  - Nested bullet points (using `-` or `*` markdown list syntax).
- Rendered as formatted text when not being edited.
- Clicking the cell enters edit mode showing raw markdown.
- Notes expand vertically to fit all content (no truncation).

### 4. Week Creation & Meeting Templating

When creating a new week (via navigation or explicit action):

1. **Clone from last week**: The most recent previous week's meetings are pre-populated into the new week, in the same day slots (Tuesday meetings go to Tuesday).
2. **Editable before confirming**: A creation modal/view shows the cloned meetings. The user can:
   - Remove meetings that don't recur.
   - Add new meetings.
   - Move meetings to different days.
3. **Confirm to create**: Finalizing creates the week with the adjusted meetings.
4. If no previous week exists, create a blank week.

### 5. Action Item Carryover

When creating a new week, **after** the meeting template step:

1. A **modal** displays all unchecked (incomplete) action items from the previous week.
2. Each item shows its original day and content.
3. The user can:
   - **Check/uncheck** items to include or exclude from the new week.
   - **Assign a day** (Mon-Fri) for each carried-over item via a dropdown.
4. Carried-over items retain their priority and content but get a fresh `is_done = false` state.
5. Items not selected are left behind (they remain in the old week, still unchecked).

### 6. Search

- **Basic text search** across all weeks.
- A search input in the header bar.
- Searches meeting titles, action item content, and note content.
- Uses Supabase full-text search (`to_tsvector` / `ts_query`) for performance.
- **Results display**: A dropdown/panel showing matching items grouped by week, with snippets.
- **Click to navigate**: Clicking a result navigates to that week and scrolls/highlights the matched item.

### 7. Delete Behavior

- **Instant delete + undo toast**: Deleting any item (meeting, action item, note content) removes it immediately.
- A toast notification appears for ~5 seconds with an "Undo" button.
- Clicking "Undo" restores the item.
- Implementation: Soft-delete with a timeout, or optimistic UI with a delayed DB call.

### 8. Auto-Save

- **Debounced auto-save**: Changes save automatically ~1 second after the user stops typing.
- No explicit save button.
- No save indicator in the UI (keep it minimal/utilitarian).
- All mutations go through Supabase client SDK with optimistic UI updates.

---

## Navigation

- **Default view**: App always opens to the **current calendar week** (the week containing today's date).
- **Prev/Next arrows**: Move one week backward/forward. If the week doesn't exist, trigger the creation flow.
- **Calendar picker**: Clicking opens a date picker. Selecting a date navigates to the week containing that date. If the week doesn't exist, trigger the creation flow.
- **Week URL**: Each week should have a unique URL (e.g., `/week/2025-02-03`) for bookmarking and back-button support.

---

## Supabase Setup Instructions

### 1. Create Project

- Create a new Supabase project at [supabase.com](https://supabase.com).
- Note the project URL and anon key for the frontend `.env`.

### 2. Enable Google OAuth

- In Supabase Dashboard > Authentication > Providers > Google.
- Create OAuth credentials in Google Cloud Console.
- Set the redirect URL to `<supabase-url>/auth/v1/callback`.
- Add Google Client ID and Secret to Supabase.

### 3. Run Schema Migration

- Execute the SQL schema above in the Supabase SQL Editor.
- This creates all tables, indexes, RLS policies, and triggers.

### 4. Environment Variables (Frontend)

```env
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

---

## Non-Goals (Explicitly Out of Scope)

- Mobile/tablet responsive design
- Multi-user or sharing functionality
- Export (CSV, PDF, markdown)
- Keyboard shortcuts (to be added later)
- Notifications or reminders
- Calendar integration (Google Calendar, Outlook)
- Recurring meeting configuration (templating from last week is sufficient)
- Day-level completion indicators
- Drag-and-drop reordering of items (auto-sort by priority instead)
- Weekend days (Sat/Sun)

---

## Open Questions / Future Considerations

- **Styling framework**: Tailwind CSS is recommended for the utilitarian aesthetic, but not locked in.
- **Markdown rendering library**: Consider `react-markdown` or `marked` for inline rendering.
- **Meeting tag autocomplete**: Library for inline mention/tag autocomplete (e.g., `tribute.js`, custom implementation, or a React mentions library).
- **Calendar picker**: Library choice (e.g., `react-day-picker`, `date-fns` for date math).
- **Hosting**: To be decided post-build. App should work on Vercel, any Node.js host, or Docker.
