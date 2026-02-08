export const DAYS_OF_WEEK = [1, 2, 3, 4, 5] as const;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const ROW_LABELS = ["Key Meetings", "Action Items", "Notes"] as const;

export const PRIORITY_LABELS = ["Low", "Medium", "High"] as const;
export const PRIORITY_COLORS = [
  "", // low = no background
  "bg-amber-50", // medium
  "bg-red-50", // high
] as const;

export const AUTOSAVE_DELAY = 1000;
export const SEARCH_DEBOUNCE = 300;
export const UNDO_TIMEOUT = 5000;
