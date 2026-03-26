"use client";

import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import type { Meeting } from "@/lib/types/database";
import { toast } from "sonner";

type MeetingItemProps = {
  meeting: Meeting;
  autoEdit?: boolean;
  onAddNext?: () => void;
  onBackspace?: () => void;
};

export function MeetingItem({ meeting, autoEdit, onAddNext, onBackspace }: MeetingItemProps) {
  const { updateMeeting, deleteMeeting, week } = useWeek();
  const { addTask, linkMeeting } = useTasks();

  const handleCreateTask = async () => {
    const task = await addTask(meeting.title, "backlog");
    if (task) {
      await linkMeeting(task.id, meeting.id, meeting.title, week?.week_start ?? null);
      toast.success("Task created from meeting");
    }
  };

  const handleSave = (title: string) => {
    if (!title.trim()) {
      deleteMeeting(meeting.id);
      return;
    }
    updateMeeting(meeting.id, title);
  };

  return (
    <li className="flex items-start gap-1 group">
      <span className="mt-0.5 select-none" style={{ color: 'var(--text-placeholder)' }}>&bull;</span>
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={meeting.title}
          onSave={handleSave}
          placeholder="Meeting title..."
          autoEdit={autoEdit}
          onEnter={onAddNext}
          onBackspace={onBackspace}
          renderView={(v) => (
            <span className="font-bold underline">{v}</span>
          )}
        />
      </div>
      <button
        onClick={handleCreateTask}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs ml-1 shrink-0"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-purple)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
        aria-label="Create task from meeting"
      >
        &rarr;
      </button>
      <button
        onClick={() => deleteMeeting(meeting.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs ml-1 shrink-0"
        style={{ color: 'var(--text-placeholder)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
        aria-label="Delete meeting"
      >
        &times;
      </button>
    </li>
  );
}
