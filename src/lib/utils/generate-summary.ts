import type { Meeting, Note, Task, Tag } from "@/lib/types/database";
import { DAY_LABELS } from "@/lib/constants";
import { stripHtml } from "@/lib/utils/strings";

export function generateWeekSummary({
  meetings,
  notes,
  completedTasks,
  tags,
  taskTags,
}: {
  meetings: Meeting[];
  notes: Note[];
  completedTasks: Task[];
  tags: Tag[];
  taskTags: Record<string, string[]>;
}): string {
  const sections: string[] = [];

  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  // Completed Tasks
  if (completedTasks.length > 0) {
    const lines = completedTasks.map((task) => {
      const tagIds = taskTags[task.id] ?? [];
      const tagNames = tagIds
        .map((id) => tagMap.get(id))
        .filter(Boolean);
      const suffix = tagNames.length > 0 ? ` (${tagNames.join(", ")})` : "";
      return `- ${task.content}${suffix}`;
    });
    sections.push(`## Completed Tasks\n${lines.join("\n")}`);
  }

  // Meetings grouped by day
  if (meetings.length > 0) {
    const byDay = new Map<number, string[]>();
    for (const m of meetings) {
      const list = byDay.get(m.day_of_week) ?? [];
      list.push(m.title);
      byDay.set(m.day_of_week, list);
    }
    const lines: string[] = [];
    for (const [day, titles] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const label = DAY_LABELS[day - 1] ?? `Day ${day}`;
      lines.push(`- ${label}: ${titles.join(", ")}`);
    }
    sections.push(`## Meetings\n${lines.join("\n")}`);
  }

  // Notes highlights
  const notesWithContent = notes.filter((n) => n.content.trim().length > 0);
  if (notesWithContent.length > 0) {
    const lines = notesWithContent
      .sort((a, b) => a.day_of_week - b.day_of_week)
      .map((n) => {
        const label = DAY_LABELS[n.day_of_week - 1] ?? `Day ${n.day_of_week}`;
        const plain = stripHtml(n.content);
        const preview = plain.length > 100 ? plain.slice(0, 100) + "..." : plain;
        return `- ${label}: ${preview}`;
      });
    sections.push(`## Notes Highlights\n${lines.join("\n")}`);
  }

  if (sections.length === 0) {
    return "No activity this week.";
  }

  return sections.join("\n\n");
}
