# Weekly Notes

A personal weekly planner for tracking meetings, action items, and notes in a Mon-Fri grid layout. Replaces a Google Sheets workflow with auto-save, meeting templates, action item carryover, and full-text search.

## Features

- **Weekly grid view** -- meetings, action items, and notes organized by day
- **Meeting tags** -- link action items to meetings with `#` autocomplete
- **Priority levels** -- color-coded action items (low / medium / high)
- **Week creation** -- clone meeting templates from previous weeks
- **Carryover** -- carry incomplete action items forward to the next week
- **Full-text search** -- search across all weeks, grouped by date
- **Calendar picker** -- jump to any week
- **Inline editing** -- click to edit, auto-save on blur
- **Undo** -- toast with undo for deletions

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- **Tailwind CSS v4**
- **TypeScript 5**

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
