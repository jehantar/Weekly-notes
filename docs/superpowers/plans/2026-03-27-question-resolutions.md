# Question Resolutions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to mark open questions as resolved (with optional answer text), persisting resolutions across analysis regeneration.

**Architecture:** New `question_resolutions` Supabase table stores resolutions keyed by a hash of the question text. The `WeekProvider` manages resolution state with optimistic updates. The `OpenQuestionsSection` component splits questions into open/resolved groups, with hover-reveal resolve/unresolve buttons and an optional inline resolution input.

**Tech Stack:** Supabase (migration + RLS), Next.js API route, Web Crypto API (SHA-256), React state in WeekProvider, sonner toasts for undo.

---

### Task 1: Database Migration + Types

**Files:**
- Create: `supabase/migrations/20260327000000_question_resolutions.sql`
- Modify: `src/lib/types/database.ts`

- [ ] **Step 1: Create the migration file**

```sql
CREATE TABLE question_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start DATE NOT NULL,
  question_hash TEXT NOT NULL,
  question_text TEXT NOT NULL,
  resolution TEXT,
  resolved_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start, question_hash)
);

ALTER TABLE question_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resolutions"
  ON question_resolutions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resolutions"
  ON question_resolutions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resolutions"
  ON question_resolutions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resolutions"
  ON question_resolutions FOR DELETE
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Push migration to Supabase**

Run: `supabase db push`
Expected: Migration applied successfully.

- [ ] **Step 3: Add types to database.ts**

Add a new table entry to the `Database` interface and a convenience type alias. Insert this after the `week_summaries` table block (after line 235) and before the closing `};` of `Tables`:

```typescript
      question_resolutions: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          question_hash: string;
          question_text: string;
          resolution: string | null;
          resolved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          question_hash: string;
          question_text: string;
          resolution?: string | null;
          resolved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          week_start?: string;
          question_hash?: string;
          question_text?: string;
          resolution?: string | null;
          resolved_at?: string;
        };
        Relationships: [];
      };
```

Add the type alias after the existing aliases (after line 267):

```typescript
export type QuestionResolution = Database["public"]["Tables"]["question_resolutions"]["Row"];
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260327000000_question_resolutions.sql src/lib/types/database.ts
git commit -m "feat: add question_resolutions table and types"
```

---

### Task 2: Hash Utility

**Files:**
- Modify: `src/lib/utils/strings.ts`

- [ ] **Step 1: Add hashQuestion function**

Append to `src/lib/utils/strings.ts`:

```typescript
/** Hash a question string for matching across regenerations.
 *  Normalizes: lowercase, trim, strip trailing punctuation.
 *  Returns first 16 hex chars of SHA-256. */
export async function hashQuestion(text: string): Promise<string> {
  const normalized = text.toLowerCase().trim().replace(/[?.!]+$/, "");
  const encoded = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/strings.ts
git commit -m "feat: add hashQuestion utility for question matching"
```

---

### Task 3: API Route

**Files:**
- Create: `src/app/api/question-resolutions/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hashQuestion } from "@/lib/utils/strings";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, weekStart } = body;

  if (!action || !weekStart) {
    return NextResponse.json({ error: "Missing action or weekStart" }, { status: 400 });
  }

  if (action === "resolve") {
    const { questionText, resolution } = body;
    if (!questionText) {
      return NextResponse.json({ error: "Missing questionText" }, { status: 400 });
    }

    const questionHash = await hashQuestion(questionText);
    const { data, error } = await supabase
      .from("question_resolutions")
      .upsert(
        {
          user_id: user.id,
          week_start: weekStart,
          question_hash: questionHash,
          question_text: questionText,
          resolution: resolution ?? null,
          resolved_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start,question_hash" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to save resolution" }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  if (action === "unresolve") {
    const { questionHash } = body;
    if (!questionHash) {
      return NextResponse.json({ error: "Missing questionHash" }, { status: 400 });
    }

    const { error } = await supabase
      .from("question_resolutions")
      .delete()
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .eq("question_hash", questionHash);

    if (error) {
      return NextResponse.json({ error: "Failed to delete resolution" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/question-resolutions/route.ts
git commit -m "feat: add question-resolutions API route"
```

---

### Task 4: Server-Side Data Loading

**Files:**
- Modify: `src/app/week/[weekStart]/page.tsx`
- Modify: `src/components/providers/week-provider.tsx`

- [ ] **Step 1: Fetch resolutions in page.tsx**

Add `QuestionResolution` to the import from `@/lib/types/database` (line 9):

```typescript
import type { Week, Meeting, Note, Task, Tag, WeekSummary, QuestionResolution } from "@/lib/types/database";
```

Add a resolutions query to the existing `Promise.all` block (lines 55-72). Add it as a 5th parallel query:

```typescript
  const [tagsRes, taskTagsRes, summaryRes, weekRes, resolutionsRes] = await Promise.all([
    supabase.from("tags").select("*").eq("user_id", user.id),
    taskIds.length > 0
      ? supabase.from("task_tags").select("*").in("task_id", taskIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("week_summaries")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single(),
    supabase
      .from("weeks")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single(),
    supabase
      .from("question_resolutions")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart),
  ]);
```

After `const summaryData = summaryRes.data;` (line 81), add:

```typescript
  const initialResolutions = (resolutionsRes.data ?? []) as QuestionResolution[];
```

Add `questionResolutions` to both branches of `initialData`. Change the `WeekData` assignment in both the `if (week)` and `else` blocks to include it:

```typescript
    initialData = {
      week,
      meetings: (meetingsRes.data ?? []) as Meeting[],
      notes: (notesRes.data ?? []) as Note[],
      summary: (summaryData as WeekSummary) ?? null,
      questionResolutions: initialResolutions,
    };
```

And in the `else` branch:

```typescript
    initialData = {
      week: null,
      meetings: [],
      notes: [],
      summary: (summaryData as WeekSummary) ?? null,
      questionResolutions: initialResolutions,
    };
```

- [ ] **Step 2: Update WeekData type and WeekProvider state**

In `src/components/providers/week-provider.tsx`, add `QuestionResolution` to the import (line 11):

```typescript
import type { Week, Meeting, Note, WeekSummary, QuestionResolution } from "@/lib/types/database";
```

Add `questionResolutions` to the `WeekData` type (after line 19):

```typescript
export type WeekData = {
  week: Week | null;
  meetings: Meeting[];
  notes: Note[];
  summary: WeekSummary | null;
  questionResolutions: QuestionResolution[];
};
```

Add resolution actions to `WeekContextType` (after the `upsertSummary` line):

```typescript
  // Question resolutions
  questionResolutions: QuestionResolution[];
  resolveQuestion: (weekStart: string, questionText: string, questionHash: string, resolution?: string) => void;
  unresolveQuestion: (weekStart: string, questionHash: string) => void;
  updateResolutionText: (questionHash: string, resolution: string) => void;
```

Add state initialization (after line 50):

```typescript
  const [questionResolutions, setQuestionResolutions] = useState(initialData.questionResolutions);
```

Update `setWeekData` to include resolutions (line 54-59):

```typescript
  const setWeekData = useCallback((data: WeekData) => {
    setWeek(data.week);
    setMeetings(data.meetings);
    setNotes(data.notes);
    setSummary(data.summary);
    setQuestionResolutions(data.questionResolutions);
  }, []);
```

- [ ] **Step 3: Implement resolveQuestion with optimistic update and undo toast**

Add after `upsertSummary` (before the `return` statement):

```typescript
  const resolveQuestion = useCallback(
    (weekStart: string, questionText: string, questionHash: string, resolution?: string) => {
      const optimistic: QuestionResolution = {
        id: crypto.randomUUID(),
        user_id: "",
        week_start: weekStart,
        question_hash: questionHash,
        question_text: questionText,
        resolution: resolution ?? null,
        resolved_at: new Date().toISOString(),
      };

      setQuestionResolutions((prev) => [...prev, optimistic]);

      const timeout = setTimeout(async () => {
        const res = await fetch("/api/question-resolutions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolve", weekStart, questionText, resolution }),
        });
        if (!res.ok) {
          setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));
          toast.error("Failed to resolve question");
        } else {
          const saved = await res.json();
          setQuestionResolutions((prev) =>
            prev.map((r) => (r.question_hash === questionHash ? saved : r))
          );
        }
      }, UNDO_TIMEOUT);

      toast("Question resolved", {
        action: {
          label: "Undo",
          onClick: () => {
            clearTimeout(timeout);
            setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));
          },
        },
        duration: UNDO_TIMEOUT,
      });
    },
    []
  );
```

- [ ] **Step 4: Implement unresolveQuestion**

```typescript
  const unresolveQuestion = useCallback(
    (weekStart: string, questionHash: string) => {
      const existing = questionResolutions.find((r) => r.question_hash === questionHash);

      setQuestionResolutions((prev) => prev.filter((r) => r.question_hash !== questionHash));

      fetch("/api/question-resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unresolve", weekStart, questionHash }),
      }).then((res) => {
        if (!res.ok && existing) {
          setQuestionResolutions((prev) => [...prev, existing]);
          toast.error("Failed to reopen question");
        }
      });
    },
    [questionResolutions]
  );
```

- [ ] **Step 5: Implement updateResolutionText**

```typescript
  const updateResolutionText = useCallback(
    (questionHash: string, resolution: string) => {
      const existing = questionResolutions.find((r) => r.question_hash === questionHash);
      if (!existing) return;

      setQuestionResolutions((prev) =>
        prev.map((r) => (r.question_hash === questionHash ? { ...r, resolution } : r))
      );

      fetch("/api/question-resolutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resolve",
          weekStart: existing.week_start,
          questionText: existing.question_text,
          resolution,
        }),
      }).then((res) => {
        if (!res.ok) {
          toast.error("Failed to save resolution");
        }
      });
    },
    [questionResolutions]
  );
```

- [ ] **Step 6: Add new values to context provider**

Update the `<WeekContext.Provider value={...}>` to include:

```typescript
        questionResolutions,
        resolveQuestion,
        unresolveQuestion,
        updateResolutionText,
```

- [ ] **Step 7: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/week/[weekStart]/page.tsx" src/components/providers/week-provider.tsx
git commit -m "feat: load and manage question resolutions in WeekProvider"
```

---

### Task 5: UI — Open Questions with Resolve/Resolved Sections

**Files:**
- Modify: `src/components/updates/analysis-sections.tsx`
- Modify: `src/components/updates/thread-view.tsx`

- [ ] **Step 1: Rewrite OpenQuestionsSection to split open/resolved**

Replace the entire `OpenQuestionsSection` in `analysis-sections.tsx` with:

```typescript
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { OpenQuestion, KeyDecision } from "@/lib/types/weekly-analysis";
import type { QuestionResolution } from "@/lib/types/database";
import { DAY_LABELS, ANALYSIS_COLOR_QUESTION, ANALYSIS_COLOR_DECISION } from "@/lib/constants";
import { hashQuestion } from "@/lib/utils/strings";

export function OpenQuestionsSection({
  questions,
  resolutions,
  weekStart,
  onResolve,
  onUnresolve,
  onUpdateResolution,
}: {
  questions: OpenQuestion[];
  resolutions: QuestionResolution[];
  weekStart: string;
  onResolve: (weekStart: string, questionText: string, questionHash: string) => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  const [hashes, setHashes] = useState<Map<number, string>>(new Map());
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const [editingHash, setEditingHash] = useState<string | null>(null);

  // Compute hashes for all questions
  useEffect(() => {
    let cancelled = false;
    async function computeHashes() {
      const map = new Map<number, string>();
      for (let i = 0; i < questions.length; i++) {
        map.set(i, await hashQuestion(questions[i].question));
      }
      if (!cancelled) setHashes(map);
    }
    computeHashes();
    return () => { cancelled = true; };
  }, [questions]);

  const resolutionMap = useMemo(
    () => new Map(resolutions.map((r) => [r.question_hash, r])),
    [resolutions]
  );

  // Split questions into open and resolved
  const openQuestions: (OpenQuestion & { hash: string })[] = [];
  const resolvedQuestions: (OpenQuestion & { hash: string; resolution: QuestionResolution })[] = [];

  for (let i = 0; i < questions.length; i++) {
    const hash = hashes.get(i);
    if (!hash) continue;
    const res = resolutionMap.get(hash);
    if (res) {
      resolvedQuestions.push({ ...questions[i], hash, resolution: res });
    } else {
      openQuestions.push({ ...questions[i], hash });
    }
  }

  if (questions.length === 0 || hashes.size === 0) return null;

  return (
    <div className="space-y-4">
      {/* Open Questions */}
      {openQuestions.length > 0 && (
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: ANALYSIS_COLOR_QUESTION }}
          >
            Open Questions
          </h3>
          <div className="space-y-2">
            {openQuestions.map((q) => {
              const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
              return (
                <div key={q.hash} className="flex gap-2 text-xs group">
                  <span className="shrink-0" style={{ color: ANALYSIS_COLOR_QUESTION }}>
                    ?
                  </span>
                  <div className="flex-1">
                    <span style={{ color: "var(--text-primary)" }}>{q.question}</span>
                    <span className="ml-2" style={{ color: "var(--text-placeholder)" }}>
                      {q.source} · {dayLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => onResolve(weekStart, q.question, q.hash)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
                    style={{ color: ANALYSIS_COLOR_DECISION }}
                    title="Mark as resolved"
                  >
                    ✓
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved Questions */}
      {resolvedQuestions.length > 0 && (
        <div>
          <button
            onClick={() => setResolvedExpanded(!resolvedExpanded)}
            className="flex items-center gap-2 mb-3"
          >
            <h3
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-placeholder)" }}
            >
              Resolved ({resolvedQuestions.length})
            </h3>
            <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
              {resolvedExpanded ? "\u25B2" : "\u25BC"}
            </span>
          </button>
          {resolvedExpanded && (
            <div className="space-y-2">
              {resolvedQuestions.map((q) => (
                <ResolvedQuestionRow
                  key={q.hash}
                  question={q}
                  resolution={q.resolution}
                  weekStart={weekStart}
                  isEditing={editingHash === q.hash}
                  onStartEditing={() => setEditingHash(q.hash)}
                  onStopEditing={() => setEditingHash(null)}
                  onUnresolve={onUnresolve}
                  onUpdateResolution={onUpdateResolution}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResolvedQuestionRow({
  question,
  resolution,
  weekStart,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUnresolve,
  onUpdateResolution,
}: {
  question: OpenQuestion & { hash: string };
  resolution: QuestionResolution;
  weekStart: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(resolution.resolution ?? "");

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onUpdateResolution(question.hash, inputValue.trim());
    }
    onStopEditing();
  };

  const dayLabel = DAY_LABELS[question.dayOfWeek - 1] ?? "";

  return (
    <div className="group">
      <div className="flex gap-2 text-xs">
        <span className="shrink-0" style={{ color: "var(--text-placeholder)" }}>
          ✓
        </span>
        <div className="flex-1">
          <span style={{ color: "var(--text-placeholder)", textDecoration: "line-through" }}>
            {question.question}
          </span>
          <span className="ml-2" style={{ color: "var(--text-placeholder)", opacity: 0.6 }}>
            {question.source} · {dayLabel}
          </span>
          {resolution.resolution && !isEditing && (
            <div
              className="mt-1 text-[11px] cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={onStartEditing}
            >
              → {resolution.resolution}
            </div>
          )}
          {!resolution.resolution && !isEditing && (
            <button
              onClick={onStartEditing}
              className="mt-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-placeholder)" }}
            >
              Add resolution...
            </button>
          )}
        </div>
        <button
          onClick={() => onUnresolve(weekStart, question.hash)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-placeholder)" }}
          title="Reopen question"
        >
          ↩
        </button>
      </div>
      {isEditing && (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Add resolution (optional)..."
          className="mt-1 ml-5 w-[calc(100%-1.25rem)] text-[11px] px-2 py-1 outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            color: "var(--text-primary)",
          }}
        />
      )}
    </div>
  );
}
```

Keep the `KeyDecisionsSection` unchanged — it stays in the same file below.

- [ ] **Step 2: Update ThreadView to pass resolutions**

Replace `src/components/updates/thread-view.tsx`:

```typescript
"use client";

import type { WeeklyAnalysis } from "@/lib/types/weekly-analysis";
import type { QuestionResolution } from "@/lib/types/database";
import { ThreadCard } from "./thread-card";
import {
  OpenQuestionsSection,
  KeyDecisionsSection,
} from "./analysis-sections";

export function ThreadView({
  analysis,
  resolutions,
  weekStart,
  onResolve,
  onUnresolve,
  onUpdateResolution,
}: {
  analysis: WeeklyAnalysis;
  resolutions: QuestionResolution[];
  weekStart: string;
  onResolve: (weekStart: string, questionText: string, questionHash: string) => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Week Overview */}
      {analysis.weekOverview && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            borderLeft: "2px solid var(--accent-purple)",
            color: "var(--text-secondary)",
            backgroundColor: "color-mix(in srgb, var(--accent-purple) 5%, transparent)",
          }}
        >
          {analysis.weekOverview}
        </div>
      )}

      {/* Threads */}
      {analysis.threads.length > 0 && (
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--accent-purple)" }}
          >
            Threads
          </h3>
          <div className="space-y-2">
            {analysis.threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </div>
      )}

      {/* Open Questions */}
      <OpenQuestionsSection
        questions={analysis.openQuestions}
        resolutions={resolutions}
        weekStart={weekStart}
        onResolve={onResolve}
        onUnresolve={onUnresolve}
        onUpdateResolution={onUpdateResolution}
      />

      {/* Key Decisions */}
      <KeyDecisionsSection decisions={analysis.keyDecisions} />
    </div>
  );
}
```

- [ ] **Step 3: Update UpdatesView to pass props to ThreadView**

In `src/components/updates/updates-view.tsx`, add the import (line 4):

```typescript
import { useWeek } from "@/components/providers/week-provider";
```

This import already exists. After line 65, destructure the new values:

```typescript
  const { meetings, notes, summary, upsertSummary, questionResolutions, resolveQuestion, unresolveQuestion, updateResolutionText } = useWeek();
```

Replace the `<ThreadView>` call (around line 209) to pass the new props:

```typescript
            <ThreadView
              analysis={analysis}
              resolutions={questionResolutions}
              weekStart={weekStart}
              onResolve={resolveQuestion}
              onUnresolve={unresolveQuestion}
              onUpdateResolution={updateResolutionText}
            />
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Test manually in browser**

1. Navigate to a week with a generated analysis
2. Verify open questions display with hover-reveal checkmark
3. Click checkmark — question moves to resolved, toast appears with Undo
4. Click Undo — question returns to open
5. Resolve a question, then expand Resolved section
6. Click "Add resolution..." — input appears, type answer, press Enter
7. Verify resolution text displays below the resolved question
8. Click reopen button (↩) — question returns to open
9. Regenerate analysis — previously resolved questions should stay resolved

- [ ] **Step 6: Commit**

```bash
git add src/components/updates/analysis-sections.tsx src/components/updates/thread-view.tsx src/components/updates/updates-view.tsx
git commit -m "feat: add resolve/unresolve UI for open questions"
```

---

### Task 6: Auto-Expand Resolved Section on First Resolve

**Files:**
- Modify: `src/components/updates/analysis-sections.tsx`

This is a polish task. When a user resolves their first question, the Resolved section should auto-expand so they can see it moved and add a resolution. Currently it defaults to collapsed.

- [ ] **Step 1: Track previous resolved count and auto-expand**

In `OpenQuestionsSection`, replace the `resolvedExpanded` state line with:

```typescript
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const prevResolvedCount = useRef(resolvedQuestions.length);

  useEffect(() => {
    if (resolvedQuestions.length > prevResolvedCount.current) {
      setResolvedExpanded(true);
      const newest = resolvedQuestions[resolvedQuestions.length - 1];
      if (newest && !newest.resolution.resolution) {
        setEditingHash(newest.hash);
      }
    }
    prevResolvedCount.current = resolvedQuestions.length;
  }, [resolvedQuestions]);
```

Note: `prevResolvedCount` ref needs to be declared inside the component. The `useRef` import is already present from step 1.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Test manually**

1. With no resolved questions, resolve one
2. Verify the Resolved section auto-expands
3. Verify the resolution input auto-focuses on the newly resolved question
4. Verify collapsing and re-expanding works normally after

- [ ] **Step 4: Commit**

```bash
git add src/components/updates/analysis-sections.tsx
git commit -m "feat: auto-expand resolved section on first resolve"
```
