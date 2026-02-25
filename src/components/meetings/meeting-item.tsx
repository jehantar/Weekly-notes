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
        {meeting.granola_note_id && (
          <div className="mt-0.5 ml-0.5">
            {meeting.granola_summary && (
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <MarkdownBlock content={meeting.granola_summary} />
              </div>
            )}
            <span className="flex items-center gap-2">
              <a
                href={meeting.granola_note_id}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline"
                style={{ color: 'var(--accent-purple)' }}
              >
                View in Granola
              </a>
              <button
                onClick={() => unlinkGranolaMeeting(meeting.id)}
                className="text-xs transition-colors"
                style={{ color: 'var(--text-placeholder)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
              >
                Unlink
              </button>
            </span>
          </div>
        )}
      </div>
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
