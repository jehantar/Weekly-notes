"use client";

import { useWeek } from "@/components/providers/week-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import { MarkdownBlock } from "@/components/shared/markdown-render";
import type { Meeting } from "@/lib/types/database";

type MeetingItemProps = {
  meeting: Meeting;
  autoEdit?: boolean;
  onAddNext?: () => void;
  onBackspace?: () => void;
};

export function MeetingItem({ meeting, autoEdit, onAddNext, onBackspace }: MeetingItemProps) {
  const { updateMeeting, deleteMeeting, unlinkGranolaMeeting } = useWeek();

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
          autoEdit={autoEdit}
          onEnter={onAddNext}
          onBackspace={onBackspace}
          renderView={(v) => (
            <span className="font-bold underline">{v}</span>
          )}
        />
        {meeting.granola_note_id && (
          <div className="mt-0.5 ml-0.5">
            {meeting.granola_summary && (
              <div className="text-xs text-gray-500">
                <MarkdownBlock content={meeting.granola_summary} />
              </div>
            )}
            <span className="flex items-center gap-2">
              <a
                href={meeting.granola_note_id}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
              >
                View in Granola
              </a>
              <button
                onClick={() => unlinkGranolaMeeting(meeting.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Unlink
              </button>
            </span>
          </div>
        )}
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
