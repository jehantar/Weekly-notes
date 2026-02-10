"use client";

import { useWeek } from "@/components/providers/week-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import { MarkdownBlock, MarkdownInline } from "@/components/shared/markdown-render";
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
        {meeting.granola_note_id && (
          <div className="mt-0.5 ml-0.5">
            {meeting.granola_summary && (
              <div className="text-xs text-gray-500">
                <MarkdownBlock content={meeting.granola_summary} />
              </div>
            )}
            <a
              href={`https://notes.granola.ai/t/${meeting.granola_note_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
            >
              View in Granola
            </a>
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
