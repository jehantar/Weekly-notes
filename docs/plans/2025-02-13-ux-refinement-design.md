# UX Refinement Design: "Refined Monospace" Day Cards

## Overview

Comprehensive UX overhaul of the Weekly Notes app. Replaces the spreadsheet-style grid with a day-card layout, elevates the visual design with warm tones and JetBrains Mono typography, adds micro-animations, and fixes practical usability gaps.

## Layout: Day Cards

Replace the 3-row x 5-column CSS grid with **5 vertical day cards** in a horizontal flex row.

```
┌─────────────────────────────────────────────────────────────┐
│  Header: ← Prev   Week of Feb 9   Next →   [Today] [🔍] [Cal] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌═════╗  ┌─────┐  ┌─────┐             │
│  │ Mon │  │ Tue │  ║ WED ║  │ Thu │  │ Fri │             │
│  │mtgs │  │mtgs │  ║mtgs ║  │mtgs │  │mtgs │             │
│  │─────│  │─────│  ║─────║  │─────│  │─────│             │
│  │items│  │items│  ║items║  │items│  │items│             │
│  │─────│  │─────│  ║─────║  │─────│  │─────│             │
│  │notes│  │notes│  ║notes║  │notes│  │notes│             │
│  └─────┘  └─────┘  └═════╝  └─────┘  └─────┘             │
└─────────────────────────────────────────────────────────────┘
```

- Each card is a vertical stack: day header → meetings → action items → notes
- Equal-width cards in a flex row with `gap-3`
- Independent per-card scrolling with `max-h-[70vh]` and `overflow-y: auto`
- Container has horizontal padding and max-width to prevent ultra-wide sprawl
- Today's card: muted purple top border + elevated shadow

## Visual Design: "Warm Terminal"

### Color Palette

| Element | Value | Notes |
|---------|-------|-------|
| Page background | `#f8f7f5` | Warm off-white |
| Card background | `#ffffff` | White, lifts off page |
| Card border | `#e5e3df` | Warm gray |
| Today accent | `#8b7ec8` | Muted purple (top border) |
| Primary text | `#1a1a1a` | Near-black, warm |
| Secondary text | `#6b6560` | Warm medium gray |
| Placeholder text | `#a8a29e` | Warm stone |
| Priority: medium | `bg-amber-50` | Keep existing |
| Priority: high | `bg-red-50` | Keep existing |
| Checkbox/done | Purple-500 | Keep existing |
| Focus ring | `ring-purple-300/50` | Warm purple |

### Typography

- **Font:** JetBrains Mono (Google Fonts) — the entire app stays monospace
- **Day header:** 14px semi-bold, date number 18px bold
- **Section labels:** 10px, uppercase, `letter-spacing: 0.1em`, warm stone color
- **Body text:** 12-13px
- **No sans-serif anywhere**

### Depth

- Cards: `shadow-sm`
- Today's card: `shadow-md`
- Active/editing card: slightly brighter shadow
- Modals: `shadow-xl` + `backdrop-blur-sm`
- Everything else: flat

### Border Radius

- No border-radius on cards, buttons, inputs (boxy monospace aesthetic)
- Exception: checkboxes (`rounded-full`), meeting tags (`rounded-sm`)
- Fix Granola button to be square like everything else

## Interactions & Animation

### Transitions

- All hover states: `transition-colors duration-150`
- Delete button reveal: `transition-opacity duration-200`
- Dropdowns (search, calendar, priority): fade-in 150ms (`opacity + translateY(-4px)`)
- Card hover: `translateY(-1px)` lift
- Week navigation: staggered card fade-in (30ms delay per card)

### Micro-interactions

- Checkbox: scale pop animation on check (`scale(0) → scale(1)`)
- New item: slides in with height animation
- Delete item: collapses (height → 0, opacity → 0) then undo toast
- Today accent border: single pulse on page load
- TipTap toolbar: fades in on focus instead of instant appear

### Keyboard Shortcuts

- `Cmd+K` or `/`: open search
- `←` / `→`: navigate weeks (when no input focused)

## Usability Fixes

1. **Today highlight** — purple top border + elevated shadow on today's card
2. **"Today" button** — in header, jumps to current week
3. **Search redesign** — command-palette overlay (Cmd+K style) instead of inline input replacement
4. **Empty state** — centered message in empty day cards with prominent add button
5. **Add buttons** — hidden by default, appear on card hover
6. **Modal depth** — shadow-xl, backdrop blur, warm borders
7. **Consistent styling** — fix Granola button, error pages to match boxy aesthetic
8. **Loading skeleton** — 5 card shapes matching day-card layout, eliminates layout shift

## Components Affected

### New/Rewritten
- `week-grid.tsx` → `day-cards.tsx` (new layout component)
- `day-card.tsx` (new: single day card with all 3 sections)
- `search-command.tsx` (new: command-palette search overlay)
- `loading.tsx` (rewrite for card-based skeleton)

### Modified
- `header.tsx` — add Today button, update search trigger, warm styling
- `week-client.tsx` — swap grid for day-cards, pass data differently
- `meetings-cell.tsx` — adapt to card section (remove grid cell styling)
- `action-items-cell.tsx` — same
- `notes-cell.tsx` — same
- `meeting-item.tsx` — add transitions, hover-reveal add buttons
- `action-item.tsx` — add transitions, checkbox animation
- `day-header.tsx` — redesign for card header (larger date, warm colors)
- `create-week-modal.tsx` — add shadow/blur depth
- `carryover-modal.tsx` — same
- `globals.css` — JetBrains Mono import, CSS variables for color palette
- `layout.tsx` — update font, background color
- `granola-sync-button.tsx` — remove border-radius for consistency

### Unchanged
- `week-provider.tsx` — no state changes needed
- `inline-edit.tsx` — styling only, no structural change
- All Supabase/API code — pure frontend change
