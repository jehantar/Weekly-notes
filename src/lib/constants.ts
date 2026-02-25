export const DAYS_OF_WEEK = [1, 2, 3, 4, 5] as const;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const PRIORITY_LABELS = ["Low", "Medium", "High"] as const;
export const PRIORITY_DOT_COLORS = [
  "var(--text-placeholder)", // 0 = low (gray)
  "#d97706",                  // 1 = medium (amber)
  "#dc2626",                  // 2 = high (red)
] as const;
export function safePriority(p: number): 0 | 1 | 2 {
  return Math.min(Math.max(p, 0), 2) as 0 | 1 | 2;
}

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "done"] as const;
export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};
export const STATUS_DOT_COLORS: Record<(typeof TASK_STATUSES)[number], string> = {
  backlog: "#8B8C90",
  todo: "#8b9eb5",
  in_progress: "#848CD0",
  done: "#8baa8b",
};

/** Sort tasks by priority (high first), then sort_order. */
export function taskSortCompare(a: { priority: number; sort_order: number }, b: { priority: number; sort_order: number }) {
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.sort_order - b.sort_order;
}

export const AUTOSAVE_DELAY = 1000;
export const SEARCH_DEBOUNCE = 300;
export const UNDO_TIMEOUT = 5000;
