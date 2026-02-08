import type { ActionItem } from "@/lib/types/database";

/** Sort action items by priority (high first), then by sort_order */
export function sortByPriority(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.sort_order - b.sort_order;
  });
}

export function getPriorityLabel(priority: number): string {
  const labels = ["Low", "Medium", "High"];
  return labels[priority] ?? "Low";
}

export function getPriorityBg(priority: number): string {
  const bgs = ["", "bg-amber-50", "bg-red-50"];
  return bgs[priority] ?? "";
}

export function cyclePriority(current: number): number {
  return (current + 1) % 3;
}
