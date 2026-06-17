# Kanban Workbench Redesign

Date: 2026-06-17
Status: Design approved for planning

## Goal

Reframe Weekly Notes around the persistent Kanban board as the primary daily work surface. The app should feel like a focused task workbench: fast capture, clear prioritization, low-friction status movement, and enough context on each task to act without returning to the old weekly notes tracker.

The old notes view remains available as a secondary reference area because historical week notes may still be useful. It should no longer be the default or visually presented as the main workflow.

## Product Direction

The app has three primary surfaces:

1. Board: the default workspace and main to-do system.
2. Screenshots: a prominent reference gallery because the user already uses it heavily.
3. Notes: preserved but de-emphasized for legacy/manual notes.

Weekly navigation remains in the shell because meetings, notes, updates, and screenshots still have week context. The Kanban board itself remains user-scoped and persistent across weeks.

## Navigation

The header tab order becomes:

```text
Board | Screenshots | Notes | Updates
```

Board maps to the existing `tasks` view internally unless a later route cleanup renames the query param. `Board` is the default view when no `view` query parameter is present.

Rules:

- Opening `/week/:weekStart` shows the Board.
- `?view=screenshots` shows Screenshots.
- `?view=notes` shows the old notes/day-card layout.
- `?view=updates` shows Updates.
- Week navigation preserves the current view except when no view is set, in which case Board remains implicit.
- Search navigation to tasks should switch to Board.

## Board Experience

The ideal board should optimize for repeated task management, not visual novelty.

### Layout

Keep the four existing columns:

- Backlog
- To Do
- In Progress
- Done

The default state should prioritize active work:

- Backlog, To Do, and In Progress are expanded.
- Done remains collapsed by default, with an easy expand affordance.
- Columns use stable widths and scroll internally so the board does not jump when task content changes.
- Empty states stay quiet and compact.

### Board Toolbar

Add a compact toolbar above the columns. It should not look like a marketing header or another tab bar.

Controls:

- Quick Add: creates a task in To Do by default.
- Filter by tag: reuse the current tag filter behavior.
- Filter by priority: High, Medium, Low, All.
- Filter by meeting: All or selected linked meeting.
- Hide Done toggle: mirrors the existing collapsed Done behavior.
- Clear filters action, visible only when filters are active.

The toolbar should surface count information that helps with execution:

- Active task count: tasks not in Done.
- In Progress count.
- Done count for the currently loaded completion window.

### Task Cards

Cards should be compact but more scannable than the current single dense row when a task has meaningful metadata.

Card content:

- Title on the first line.
- Priority indicator as a small dot or icon.
- Meeting link, if present.
- Tags, capped to avoid wrapping noise.
- Subtask progress, if subtasks exist.
- A subtle detail indicator when description exists.

Interaction rules:

- Clicking the card opens the detail panel.
- Clicking the title edits inline.
- Dragging moves tasks between columns.
- Keyboard focus is visible.
- Delete remains available but secondary; accidental deletion should continue to use undo.

The card should not expose every property at all times. The board is for scanning; the panel is for detail.

### Fast Capture

Task creation should be faster than the current per-column hover add flow.

Requirements:

- A global Quick Add control adds to To Do.
- Column-level add still exists for backlog or specific status capture.
- Enter creates the task.
- Escape cancels.
- Empty blur cancels.
- After adding one task from Quick Add, focus remains ready for another task.

## Task Detail Panel

The task panel becomes the source of truth for actionable context.

Existing fields to retain:

- Title
- Status
- Priority
- Meeting link
- Tags
- Subtasks
- Rich description
- Created/completed dates

Improvements:

- Make metadata rows easier to scan by grouping operational fields together: Status, Priority, Meeting, Tags.
- Move subtasks above the rich description because subtasks are more actionable than notes.
- Keep rich description for task-specific context, pasted links, and image uploads.
- Preserve Escape/click-outside close behavior.
- Keep all saves optimistic with rollback/toast on failure.

Near-term scope does not require new task schema. The existing `description`, `meeting_id`, tags, subtasks, and task image upload support are enough for the first workbench pass.

## Screenshots

Screenshots stay a prominent top-level surface and should appear before Notes in navigation.

First implementation:

- Keep existing global/user-scoped screenshot behavior.
- Preserve paste, drag/drop, upload, caption, and delete behavior.
- Do not attach screenshots directly to tasks yet.

Future extension:

- Allow selecting one or more screenshots and linking them to a task.
- Show linked screenshots in the task detail panel.

This is intentionally out of first implementation to avoid adding a join table before the core workbench is validated.

## Notes

The old notes experience stays available but de-emphasized.

Changes:

- Notes is no longer the default view.
- Notes moves after Screenshots in the tab order.
- The label remains clear enough for legacy content. If the UI later needs more clarity, rename to `Notes` or `Reference`; do not introduce both.

No note editor behavior changes are part of the first implementation.

## Meeting Notes Attachment Direction

The user does not need another manual notes tracker because Gemini already captures meeting notes. The future product direction is to attach external meeting artifacts to the workbench.

Preferred future model:

- A meeting can have one or more external note links or imported summaries.
- A task can link to a meeting.
- The task panel can then show the meeting note reference through the existing meeting relationship.

This avoids copying every meeting transcript into every task. Tasks remain actionable; meetings remain context.

Out of scope for first implementation:

- Gemini API integration.
- Google Drive/Docs import.
- Meeting artifact schema.
- Automatic task extraction from meeting notes.

## Data Flow

Initial page load:

- Server fetches user-scoped active/recent tasks as it does today.
- Server fetches tags and task-tag relationships.
- Server fetches week-scoped meetings/notes only when a week exists.
- Client defaults to Board when no explicit view is selected.

Task mutation:

- Use existing `TasksProvider` optimistic mutations.
- Board filters operate client-side over loaded tasks.
- Reordering and status movement continue to persist through existing task update/reorder calls.

Screenshots and notes:

- Continue to use existing `WeekProvider` flows.

## Error Handling

Keep the current optimistic-update pattern:

- Task create/update/move/reorder failures show a toast and roll back when a safe snapshot exists.
- Delete continues to use undo before final deletion.
- Filter controls are local-only and should never block board rendering.
- If meeting data is unavailable, task meeting links should degrade to the stored `meeting_title`.
- If screenshots fail to upload, preserve the current pending preview cleanup and toast.

## Accessibility And Keyboard

The workbench should support fast keyboard use:

- `/` and `Cmd+K` continue to open search.
- Escape clears bulk selection, then closes the detail panel.
- Quick Add supports Enter and Escape.
- Focus rings use the existing accent token.
- Icon-only buttons need accessible names and hover tooltips.
- Drag handles should not be the only way to change status; the detail panel status dropdown remains the accessible fallback.

## Visual Direction

Use the existing restrained Linear-inspired visual system, but make the board feel more purposeful:

- No hero sections.
- No decorative backgrounds.
- Compact toolbar.
- Stable column dimensions.
- Cards use restrained metadata and avoid wrapping.
- Board should fit dense real work without feeling cramped.
- Screenshots and Notes tabs should not compete visually with Board.

## Implementation Slices

1. Navigation and default behavior:
   - Board becomes the default view.
   - Tab labels/order become Board, Screenshots, Notes, Updates.
   - Week navigation preserves Board as the implicit default.

2. Board toolbar:
   - Introduce a compact board toolbar component.
   - Move tag filtering into the toolbar or visually integrate it with the toolbar.
   - Add priority and meeting filters.
   - Add Quick Add to To Do.

3. Card and column polish:
   - Improve card metadata hierarchy.
   - Keep stable dimensions and internal scrolling.
   - Preserve current drag/drop and bulk selection behavior.

4. Detail panel polish:
   - Reorder panel sections around actionability.
   - Improve metadata scanability.
   - Keep existing persistence behavior.

5. Verification:
   - Validate default routing and query-param behavior.
   - Validate task create/update/move/reorder.
   - Validate filters, Quick Add, and panel editing.
   - Browser-check desktop and narrow viewport layouts.

## Acceptance Criteria

- Visiting `/week/:weekStart` opens Board by default.
- Notes remains reachable but is not the first/default tab.
- Screenshots is the second tab and continues to work.
- Existing task CRUD, drag/drop, tags, subtasks, meeting links, and descriptions still work.
- Quick Add can create multiple To Do tasks quickly.
- Priority and meeting filters work together with tag filters.
- Done can still be collapsed/expanded.
- No database migration is required for the first implementation.
- The UI remains compact, stable, and readable on desktop and usable on narrow viewports.
