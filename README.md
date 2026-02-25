# Weekly Notes

A personal productivity app for tracking meetings, tasks, and notes in a weekly layout. Features a persistent kanban task board, calendar integration with AI-powered meeting summaries, and a dark mode UI inspired by Linear.

## Features

### Weekly Notes View
- **Day-card layout** -- meetings, notes, and action items organized Mon-Fri
- **Rich text notes** -- TipTap editor with bold, italic, lists, links
- **Meeting tags** -- link action items to meetings with `#` autocomplete
- **Week creation** -- clone meeting templates from previous weeks
- **Carryover** -- carry incomplete action items forward to the next week
- **Command palette** -- search across all weeks with `Cmd+K`
- **Calendar picker** -- jump to any week
- **Inline editing** -- click to edit, auto-save on blur
- **Undo** -- toast with undo for deletions

### Kanban Task Board
- **4-column board** -- Backlog, To Do, In Progress, Done
- **Drag and drop** -- reorder tasks within and across columns (dnd-kit)
- **Persistent tasks** -- tasks live independently of any week
- **Collapsible Done column** -- hide completed tasks to reduce clutter
- **Task detail panel** -- slide-out panel for editing title, status, priority, meeting link, and description
- **Rich descriptions** -- full TipTap editor with formatting, links, lists, and inline image uploads
- **Meeting linking** -- associate tasks with meetings via autocomplete
- **Priority levels** -- color-coded Low / Medium / High
- **Keyboard shortcuts** -- navigate and create tasks from the keyboard

### Calendar Integration (Granola)
- **OAuth connection** -- securely connect your calendar via Granola
- **One-click sync** -- pull meetings into the current week
- **AI meeting summaries** -- auto-generate bullet-point summaries
- **Duplicate detection** -- skip already-synced meetings

### UI
- **Dark mode** -- Linear-inspired dark theme with purple accents
- **View tabs** -- toggle between Notes and Tasks views
- **Micro-interactions** -- smooth transitions, drag glow effects, hover states

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Supabase** (PostgreSQL, Auth, Row Level Security, Storage)
- **Tailwind CSS v4**
- **TypeScript 5**
- **TipTap** (rich text editing)
- **dnd-kit** (drag and drop)
- **Vercel AI SDK + OpenRouter** (meeting summaries)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/jehantar/Weekly-notes.git
cd Weekly-notes
npm install
```

### 2. Set up Supabase

- Create a project at [supabase.com](https://supabase.com)
- Run the migrations in `supabase/migrations/` (in order) via the SQL editor
- Enable Google OAuth under Authentication > Providers
- Add your app URL to Authentication > URL Configuration > Redirect URLs
- Create a `task-images` storage bucket for task description image uploads

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key. Optionally set `ALLOWED_EMAILS` to restrict access.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy

Works out of the box on [Vercel](https://vercel.com). Connect the repo, add your environment variables, and deploy.
