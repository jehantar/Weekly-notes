# Weekly Analysis Redesign — Design Spec

## Overview

Replace the current updates tab (static markdown summary) with an AI-powered weekly analysis that organizes notes into cross-meeting **threads**, surfacing themes, connections, open questions, and key decisions.

## Problem

The current updates tab generates a flat summary listing meetings by day and truncated note snippets. It doesn't help the user understand what happened across their week — no theme extraction, no cross-meeting connections, no distinction between notes, questions, and decisions.

## Solution

A thread-based analysis view powered by an LLM (Gemini 2.5 Flash via OpenRouter) that:
1. Parses all meetings and notes for the week
2. Groups related discussion points across meetings into named threads
3. Integrates completed kanban tasks into relevant threads
4. Extracts open questions (lines ending in `?`) and key decisions
5. Presents everything in a structured, editable UI

## Data Sources

The analysis is built from three data sources already available in the app:

1. **Meetings** — titles, day_of_week, sort_order (from `meetings` table)
2. **Notes** — HTML content from TipTap, one per day (from `notes` table). Structure: meeting titles as headers, bullet points underneath. Lines ending in `?` are questions the user plans to ask in meetings.
3. **Completed tasks** — tasks with `status = 'done'` for the week, including tags (from `tasks` + `task_tags` + `tags` tables)

## API Design

### `POST /api/weekly-analysis`

**Request:**
```json
{ "weekStart": "2026-03-23" }
```

**Server-side steps:**
1. Authenticate via cookie-based Supabase client (consistent with all existing routes)
2. Fetch meetings, notes, and completed tasks for the week from Supabase
3. Parse HTML notes into plain text using `stripHtml()` utility
4. For each day, match note content against that day's meeting titles to attribute bullet points to specific meetings
5. Build the LLM prompt with structured meeting notes, questions, and completed tasks
6. Call OpenRouter API (`google/gemini-2.5-flash`) with the prompt
7. Parse the JSON response and return it

**Response:**
```json
{
  "threads": [
    {
      "id": "generated-uuid",
      "name": "Authentication Overhaul",
      "color": "#848CD0",
      "appearances": [
        {
          "meetingTitle": "Backend Sync",
          "dayOfWeek": 1,
          "points": ["Token refresh is broken", "Need to investigate OAuth flow"],
          "questions": []
        },
        {
          "meetingTitle": "Security Review",
          "dayOfWeek": 3,
          "points": ["Flagged as P1 compliance issue"],
          "questions": ["Who owns the migration timeline?"]
        }
      ],
      "completedTasks": [
        { "title": "Fix token refresh logic", "dayCompleted": 4, "tags": ["backend"] }
      ]
    }
  ],
  "openQuestions": [
    {
      "question": "Who owns the migration timeline?",
      "source": "Security Review",
      "dayOfWeek": 3
    }
  ],
  "keyDecisions": [
    {
      "decision": "Auth overhaul added to sprint, assigned to backend team",
      "source": "Sprint Planning",
      "dayOfWeek": 4
    }
  ],
  "weekOverview": "Brief 1-2 sentence narrative summary of the week"
}
```

### Note Parsing Logic

Each day's note content is HTML from TipTap. Parsing steps:
1. Convert HTML to plain text (strip tags, preserve line breaks)
2. For each day, get that day's meeting titles (ordered by sort_order)
3. Split the note text by lines that match a meeting title (fuzzy match — the header may not be exact)
4. Attribute subsequent bullet points to the matched meeting
5. Lines ending in `?` are tagged as questions

### LLM Prompt Structure

The prompt sends:
- Structured meeting data grouped by day (Mon–Fri)
- Each meeting's attributed notes and questions
- List of completed tasks with tags
- Instructions to return valid JSON matching the response schema
- Guidance: questions (lines ending in `?`) are things the user planned to ask, not answers
- Guidance: look for declarative statements ("decided to", "going with", "agreed on") as key decisions
- Thread color assignment from a fixed palette of 6 colors

### OpenRouter Integration

- **Model:** `google/gemini-2.5-flash` (best price/quality for structured analysis)
- **Auth:** `OPENROUTER_API_KEY` environment variable
- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Request format:** OpenAI-compatible (OpenRouter's standard interface)
- **Response parsing:** Extract JSON from the completion, validate against expected schema
- **Error handling:** Return a user-friendly error if API call fails, model returns invalid JSON, or key is missing

## Storage

Reuse the existing `week_summaries` table. The `content` column (TEXT) currently stores markdown. The new analysis stores a JSON string instead. Format detection:
- Try `JSON.parse(content)` — if it succeeds, render as thread view
- If it fails, render as markdown (backwards compatible with existing summaries)

No schema migration needed.

## UI Design

### Layout (Thread-Based View)

The updates tab renders these sections top to bottom:

**Header bar:**
- "Weekly Analysis" title
- Subtitle: "Week of {date} · {N} meetings · {N} days of notes"
- Buttons: "Edit" (toggle edit mode) | "Generate Analysis" / "Regenerate" (calls API)

**Week Overview:**
- 1-2 sentence narrative summary
- Styled as a block quote with purple left border

**Threads section:**
- Section header: "THREADS" (purple, uppercase, tracked)
- Each thread is a card with:
  - Colored dot (from 6-color palette) + thread name + meeting count
  - Collapsible timeline showing appearances chronologically
  - Each appearance: day abbreviation (Mon/Tue/etc) + meeting title + bullet points
  - Questions highlighted in gold (#C4A46B) within the flow
  - Completed tasks shown with ✓ prefix and "(completed {day})" suffix
- Threads are collapsible — click header to toggle

**Open Questions section:**
- Section header: "OPEN QUESTIONS" (gold, uppercase, tracked)
- Each question: gold `?` icon + question text + source meeting + day
- Flat list, no nesting

**Key Decisions section:**
- Section header: "KEY DECISIONS" (green, uppercase, tracked)
- Each decision: green `→` icon + decision text + source meeting + day
- Flat list, no nesting

**Past Analyses:**
- Divider line
- Section header: "PAST ANALYSES" (muted, uppercase)
- Expandable list of previous weeks' analyses (reuses existing summary-list pattern)
- Supports both old markdown summaries and new thread-based JSON

### Edit Mode

When "Edit" is clicked:
- The entire analysis switches to a markdown textarea (same as current summary editor)
- The stored JSON is converted to readable markdown for editing: thread names as `##` headers, appearances as `### Day · Meeting` subheaders, bullet points as `-` items, questions prefixed with `?`, completed tasks prefixed with `✓`
- On save, the edited markdown replaces the JSON in `week_summaries.content`. Subsequent renders detect it as markdown (not JSON) and display it using the existing `SummaryMarkdown` component
- This is a one-way operation — editing converts from structured threads to freeform markdown. The user can always "Regenerate" to get fresh threads

### Empty State

When no analysis exists for the current week:
- Centered CTA: "Generate your weekly analysis"
- Subtitle: "Analyze your meetings and notes to find themes, connections, and open questions"
- Single "Generate Analysis" button

### Loading State

While the API call is in progress:
- Button shows spinner + "Analyzing..."
- Disabled state on button to prevent double-clicks

### Color Palette (Thread Colors)

Six colors that work in both dark and light mode:
1. `#848CD0` (purple — matches accent)
2. `#6B9E78` (green)
3. `#C4A46B` (gold)
4. `#C47070` (red)
5. `#6BA5C4` (blue)
6. `#B07CC4` (violet)

Assigned by the LLM in order of thread prominence.

## Component Structure

```
src/components/updates/
  updates-view.tsx        — refactor: orchestrator, generate/edit/display states
  thread-view.tsx         — NEW: renders the full thread-based analysis
  thread-card.tsx         — NEW: single collapsible thread with timeline
  analysis-sections.tsx   — NEW: open questions + key decisions sections
  summary-markdown.tsx    — KEEP: used for edit mode and old markdown summaries
  summary-list.tsx        — MODIFY: support both markdown and JSON past analyses
```

```
src/app/api/weekly-analysis/
  route.ts                — NEW: POST endpoint for LLM analysis
```

```
src/lib/utils/
  generate-summary.ts     — KEEP: still used as fallback or can be removed
  parse-notes.ts          — NEW: HTML → structured meeting notes parser
```

## Error Handling

- **Missing API key:** Show toast "OpenRouter API key not configured" with setup instructions
- **API failure:** Show toast with error message, preserve any existing analysis
- **Invalid JSON from LLM:** Retry once, then show toast "Analysis generation failed — try again"
- **No meetings/notes:** Show message "Add meetings and notes throughout the week, then generate your analysis"

## Environment Setup

One new environment variable:
```
OPENROUTER_API_KEY=sk-or-...
```

Added to `.env.local` (already gitignored).

## Out of Scope

- Real-time/streaming analysis generation
- Per-thread editing (edit mode is full-document)
- Cross-week thread tracking (threads are per-week only)
- Custom thread colors (assigned by LLM from fixed palette)
- Automatic generation (always user-triggered via button)
