export const DAYS_OF_WEEK = [1, 2, 3, 4, 5] as const;
export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const PRIORITY_LABELS = ["Low", "Medium", "High"] as const;

export const TASK_STATUSES = ["backlog", "todo", "in_progress", "done"] as const;
export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

export const AUTOSAVE_DELAY = 1000;
export const SEARCH_DEBOUNCE = 300;
export const UNDO_TIMEOUT = 5000;
