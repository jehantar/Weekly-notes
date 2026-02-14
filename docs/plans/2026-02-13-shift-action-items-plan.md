# Shift Forward Action Items — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When navigating forward to an existing week, offer to move uncompleted action items to that week.

**Architecture:** Intercept forward navigation in WeekClient. If uncompleted action items exist, show a ShiftItemsModal (reusing CarryoverModal's UI pattern). On confirm, insert items into target week + delete from current week, then navigate. If target week doesn't exist, the existing CreateWeekModal handles it (unchanged).

**Tech Stack:** React 19, Next.js App Router, Supabase, TypeScript, Tailwind v4

---

### Task 1: Add `onNavigateForward` prop to WeekNav

**Files:**
- Modify: `src/components/layout/week-nav.tsx:15-17` (navigateWeek function)
- Modify: `src/components/layout/week-nav.tsx:6-11` (props type)

**Step 1: Add the prop and use it for forward nav**

Change `WeekNav` to accept an optional `onNavigateForward` callback. When clicking "Next →", call `onNavigateForward` instead of navigating directly. Back and Today remain unchanged.

```tsx
export function WeekNav({
  weekStart,
  monday,
  onNavigateForward,
}: {
  weekStart: string;
  monday: Date;
  onNavigateForward?: () => void;
}) {
  const router = useRouter();

  const navigateWeek = (offset: number) => {
    const target = addWeeks(monday, offset);
    router.push(`/week/${formatWeekStart(target)}`);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigateWeek(-1)}
        // ... unchanged
      >
        &larr; Prev
      </button>
      <span className="text-base font-bold min-w-[140px] text-center">
        {getWeekLabel(monday)}
      </span>
      <button
        onClick={() => onNavigateForward ? onNavigateForward() : navigateWeek(1)}
        // ... unchanged
      >
        Next &rarr;
      </button>
      {/* Today button unchanged */}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/components/layout/week-nav.tsx"
git commit -m "feat: add onNavigateForward prop to WeekNav"
```

---

### Task 2: Create ShiftItemsModal

**Files:**
- Create: `src/components/modals/shift-items-modal.tsx`

**Step 1: Create the modal component**

Reuse the same UI pattern as `CarryoverModal` (`src/components/modals/carryover-modal.tsx`). Key differences:
- Button label: "Shift Items" instead of "Create Week"
- No "Back" button (single-step flow)
- `onSkip` navigates without moving
- `onConfirm` receives selected items for the move

```tsx
"use client";

import { useState } from "react";
import { DAYS_OF_WEEK, DAY_LABELS } from "@/lib/constants";
import { getPriorityBg } from "@/lib/utils/priority";
import type { ActionItem } from "@/lib/types/database";

type ShiftItem = {
  id: string;
  content: string;
  priority: number;
  original_day: number;
  target_day: number;
  included: boolean;
};

export function ShiftItemsModal({
  items,
  onConfirm,
  onSkip,
  shifting,
}: {
  items: ActionItem[];
  onConfirm: (
    items: { id: string; content: string; priority: number; day_of_week: number }[]
  ) => void;
  onSkip: () => void;
  shifting: boolean;
}) {
  const [shiftItems, setShiftItems] = useState<ShiftItem[]>(
    items.map((item) => ({
      id: item.id,
      content: item.content,
      priority: item.priority,
      original_day: item.day_of_week,
      target_day: item.day_of_week,
      included: true,
    }))
  );

  const toggleItem = (id: string) => {
    setShiftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  };

  const setTargetDay = (id: string, day: number) => {
    setShiftItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, target_day: day } : item
      )
    );
  };

  const handleConfirm = () => {
    const included = shiftItems
      .filter((item) => item.included)
      .map((item) => ({
        id: item.id,
        content: item.content,
        priority: item.priority,
        day_of_week: item.target_day,
      }));
    onConfirm(included);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-card)",
        }}
      >
        <h2 className="text-lg font-bold mb-1">Shift Action Items</h2>
        <p className="text-xs text-gray-500 mb-4">
          {items.length} incomplete item{items.length !== 1 ? "s" : ""} in this
          week. Select which to move forward.
        </p>

        <div className="space-y-1 mb-4">
          {shiftItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 text-xs border border-gray-100 ${getPriorityBg(
                item.priority
              )}`}
            >
              <input
                type="checkbox"
                checked={item.included}
                onChange={() => toggleItem(item.id)}
                className="shrink-0"
              />
              <span
                className={`flex-1 ${
                  !item.included ? "line-through text-gray-300" : ""
                }`}
              >
                {item.content}
              </span>
              <span className="text-gray-400 text-[10px]">
                {DAY_LABELS[item.original_day - 1]}
              </span>
              <select
                value={item.target_day}
                onChange={(e) =>
                  setTargetDay(item.id, Number(e.target.value))
                }
                disabled={!item.included}
                className="text-[10px] border border-gray-200 bg-white disabled:opacity-30"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d - 1]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-1.5 border border-gray-300 text-sm hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={shifting}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
          >
            {shifting ? "Shifting..." : "Shift Items"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/components/modals/shift-items-modal.tsx"
git commit -m "feat: add ShiftItemsModal component"
```

---

### Task 3: Add `removeActionItems` to WeekProvider

**Files:**
- Modify: `src/components/providers/week-provider.tsx:22-39` (WeekContextType)
- Modify: `src/components/providers/week-provider.tsx:231-314` (action item section)
- Modify: `src/components/providers/week-provider.tsx:409-432` (provider value)

**Step 1: Add the method**

Add a `removeActionItems` function that removes items by ID from local state. The actual DB delete happens in ShiftItemsModal's confirm handler (WeekClient), not in the provider — the provider just updates local state.

In the `WeekContextType`:
```tsx
removeActionItems: (ids: string[]) => void;
```

In the provider body (after `setPriority`):
```tsx
const removeActionItems = useCallback(
  (ids: string[]) => {
    setActionItems((prev) => prev.filter((ai) => !ids.includes(ai.id)));
  },
  []
);
```

Add `removeActionItems` to the context value object.

**Step 2: Commit**

```bash
git add "src/components/providers/week-provider.tsx"
git commit -m "feat: add removeActionItems to WeekProvider"
```

---

### Task 4: Wire up ShiftItemsModal in WeekClient

**Files:**
- Modify: `src/app/week/[weekStart]/week-client.tsx`

**Step 1: Add shift modal state and intercept forward nav**

Add state for `showShiftModal`. Create `handleNavigateForward` that checks for uncompleted items. If found, opens the modal. Otherwise navigates directly.

The `handleShiftConfirm` function:
1. Queries Supabase for the target week ID
2. Inserts selected items into target week
3. Deletes originals from current week
4. Calls `removeActionItems` to update local state
5. Navigates to target week

Key additions to imports:
```tsx
import { ShiftItemsModal } from "@/components/modals/shift-items-modal";
import { useWeek } from "@/components/providers/week-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
```

New state and handlers:
```tsx
const { actionItems, removeActionItems } = useWeek();
const supabase = useSupabase();
const [showShiftModal, setShowShiftModal] = useState(false);
const [shifting, setShifting] = useState(false);

const nextWeekStart = formatWeekStart(addWeeksUtil(monday, 1));

const uncompletedItems = actionItems.filter((ai) => !ai.is_done);

const handleNavigateForward = () => {
  if (weekExists && uncompletedItems.length > 0) {
    setShowShiftModal(true);
  } else {
    router.push(`/week/${nextWeekStart}`);
  }
};

const handleShiftConfirm = async (
  items: { id: string; content: string; priority: number; day_of_week: number }[]
) => {
  if (items.length === 0) {
    setShowShiftModal(false);
    router.push(`/week/${nextWeekStart}`);
    return;
  }

  setShifting(true);

  // Get target week ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { setShifting(false); return; }

  const { data: targetWeek } = await supabase
    .from("weeks")
    .select("id")
    .eq("user_id", user.id)
    .eq("week_start", nextWeekStart)
    .single();

  if (!targetWeek) {
    toast.error("Target week not found");
    setShifting(false);
    return;
  }

  // Insert into target week
  const { error: insertError } = await supabase
    .from("action_items")
    .insert(
      items.map((item, i) => ({
        week_id: targetWeek.id,
        day_of_week: item.day_of_week,
        content: item.content,
        priority: item.priority,
        sort_order: i,
        meeting_id: null as string | null,
      }))
    );

  if (insertError) {
    toast.error("Failed to shift items");
    setShifting(false);
    return;
  }

  // Delete from current week
  const ids = items.map((item) => item.id);
  const { error: deleteError } = await supabase
    .from("action_items")
    .delete()
    .in("id", ids);

  if (deleteError) {
    toast.error("Failed to remove shifted items from current week");
    setShifting(false);
    return;
  }

  removeActionItems(ids);
  setShowShiftModal(false);
  setShifting(false);
  router.push(`/week/${nextWeekStart}`);
};

const handleShiftSkip = () => {
  setShowShiftModal(false);
  router.push(`/week/${nextWeekStart}`);
};
```

Also update the ArrowRight keyboard handler (line 69) to call `handleNavigateForward()` instead of `router.push(...)`.

Pass `onNavigateForward={handleNavigateForward}` to `<Header>` and down to `<WeekNav>`.

Render the modal:
```tsx
{showShiftModal && (
  <ShiftItemsModal
    items={uncompletedItems}
    onConfirm={handleShiftConfirm}
    onSkip={handleShiftSkip}
    shifting={shifting}
  />
)}
```

**Step 2: Update Header to pass onNavigateForward**

`Header` needs to accept and forward `onNavigateForward` to `WeekNav`.

Modify `src/components/layout/header.tsx`:
- Add `onNavigateForward?: () => void` to props
- Pass it to `<WeekNav onNavigateForward={onNavigateForward} />`

**Step 3: Commit**

```bash
git add "src/app/week/[weekStart]/week-client.tsx" "src/components/layout/header.tsx"
git commit -m "feat: wire up shift items modal on forward navigation"
```

---

### Task 5: Manual test and final commit

**Step 1: Run dev server and test**

```bash
npm run dev
```

Test scenarios:
1. Navigate forward with uncompleted items → modal appears
2. Select some items, reassign days, click "Shift Items" → items moved, navigate to next week, items appear there
3. Click "Skip" → navigate without moving
4. Navigate forward with all items completed → no modal, direct nav
5. Navigate backward → no modal (unchanged)
6. Navigate forward to non-existent week → CreateWeekModal appears (unchanged)
7. ArrowRight keyboard shortcut → same behavior as clicking "Next →"

**Step 2: Final commit if any fixes needed**
