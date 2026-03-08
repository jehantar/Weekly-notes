import { stripHtml } from "@/lib/utils/strings";
import { TAG_COLORS } from "@/lib/constants";
import { useTasks } from "@/components/providers/tasks-provider";

export function HoverPreview({ taskId }: { taskId: string }) {
  const { tasks, tags, taskTags, subtasks } = useTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const taskTagIds = taskTags[taskId] ?? [];
  const taskSubtasks = subtasks[taskId];

  const descriptionText = task.description ? stripHtml(task.description) : "";
  const hasDescription = descriptionText.length > 0;
  const hasSubtasks = taskSubtasks && taskSubtasks.length > 0;
  const hasTags = taskTagIds.length > 0;

  if (!hasDescription && !hasSubtasks && !hasTags) return null;

  const truncated =
    descriptionText.length > 150
      ? descriptionText.slice(0, 150) + "..."
      : descriptionText;

  return (
    <div
      className="absolute left-0 right-0 z-40"
      style={{
        top: "100%",
        animation: "fadeIn 100ms ease-out",
      }}
    >
      <div
        className="mx-2 mt-1 p-2.5 flex flex-col gap-1.5"
        style={{
          maxWidth: 280,
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border-card)",
          boxShadow: "var(--shadow-card-drag)",
        }}
      >
        {hasDescription && (
          <p
            className="text-[11px] leading-relaxed m-0"
            style={{ color: "var(--text-secondary)" }}
          >
            {truncated}
          </p>
        )}
        {hasSubtasks && (
          <p
            className="text-[11px] m-0"
            style={{ color: "var(--text-placeholder)" }}
          >
            Subtasks: {taskSubtasks.filter((s) => s.completed).length}/{taskSubtasks.length} completed
          </p>
        )}
        {hasTags && (
          <div className="flex flex-wrap gap-1">
            {taskTagIds.map((tagId) => {
              const tag = tags.find((t) => t.id === tagId);
              if (!tag) return null;
              const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
              return (
                <span
                  key={tag.id}
                  className="text-[10px] px-1 py-0.5"
                  style={{ backgroundColor: color.bg, color: color.text }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
