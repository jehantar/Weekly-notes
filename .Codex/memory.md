# Weekly Notes Memory

- The app currently has persistent Kanban tasks, week/day notes, weekly updates, screenshots, acronyms, and meeting linking.
- User mainly uses the Kanban board as the to-do list and the screenshots tab; the notes tracker is less useful because meetings are recorded and Gemini already produces meeting notes.
- Current product direction: implement Option 2, a Kanban Workbench. The Kanban board becomes the primary workspace, screenshots remain prominent, and the old notes tab stays available but de-emphasized.
- Week navigation controls in the header must preserve the active `view` query for `screenshots`, `notes`, and `updates`; `tasks`/Board stays queryless.
- `KanbanBoardToolbar` is now integrated into `src/components/kanban/kanban-board.tsx` with tag, priority, and meeting filters plus Done collapse controls.
- Whitespace-only quick-add blur should clear the input value before closing so reopening the composer does not show stale spaces.
- Kanban card metadata rows should stay mounted when they host low-noise actions like meeting linking; hiding the row can remove the board-level meeting affordance on plain tasks.
