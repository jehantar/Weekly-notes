"use client";

import { useWeek } from "@/components/providers/week-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import { MarkdownInline } from "@/components/shared/markdown-render";
import type { Meeting } from "@/lib/types/database";

export function MeetingItem({ meeting }: { meeting: Meeting }) {
  const { updateMeeting, deleteMeeting } = useWeek();

  const handleSave = (title: string) => {
    if (!title.trim()) {
      deleteMeeting(meeting.id);
      return;
    }
    updateMeeting(meeting.id, title);
  };

  return (
    <li className="flex items-start gap-1 group">
      <span className="text-gray-400 mt-0.5 select-none">&bull;</span>
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={meeting.title}
          onSave={handleSave}
          placeholder="Meeting title..."
          renderView={(v) => <MarkdownInline content={v} />}
        />
      </div>
      <button
        onClick={() => deleteMeeting(meeting.id)}
        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-xs ml-1 shrink-0"
        aria-label="Delete meeting"
      >
        &times;
      </button>
    </li>
  );
}
