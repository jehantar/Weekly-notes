# Shift Forward Uncompleted Action Items — Design

## Problem
When navigating forward to an existing week, there's no way to bring uncompleted action items along. The carryover modal only appears when creating a new week.

## Solution
Intercept forward navigation. If the current week has uncompleted action items, show a modal letting the user select which items to move (with day reassignment). Items are moved, not copied.

## Flow

1. User clicks "Next →" or presses ArrowRight
2. Check current week's `actionItems` for `is_done === false`
3. If none → navigate immediately (zero friction)
4. If some → open ShiftItemsModal
5. User selects items + reassigns days → confirm
6. On confirm: insert into target week, delete from current week, navigate
7. On skip: navigate without moving

## Scope Boundaries

- **Target week exists** → ShiftItemsModal (this feature)
- **Target week doesn't exist** → CreateWeekModal as today (already has carryover)
- Backward nav and "Today" button are unchanged

## Component Changes

### `WeekNav`
Add `onNavigateForward` callback prop. Forward button and ArrowRight call it instead of navigating directly. Back/Today unchanged.

### `WeekClient`
- New state: `showShiftModal`, `shiftTarget` (target week_start string)
- `onNavigateForward`: checks for uncompleted items → opens modal or navigates
- Passes uncompleted items + target to ShiftItemsModal

### New: `ShiftItemsModal`
Same UI pattern as CarryoverModal:
- Checkbox list with day pickers, priority badges
- Buttons: "Skip" (navigate without moving) and "Shift Items" (move + navigate)
- No "Back" button (single-step flow)

### `WeekProvider`
New method: `removeActionItems(ids: string[])` to update local state after DB delete.

## Move Logic
1. Look up target week ID via Supabase query
2. Insert selected items into target week (new UUIDs assigned by DB)
3. Delete original items from current week
4. Remove from local `actionItems` state
5. Navigate to target week

## Edge Cases
- No uncompleted items → navigate immediately, no modal
- Target week doesn't exist → existing CreateWeekModal flow handles it (no change)
- DB error on insert/delete → show toast, don't navigate, don't remove from state
