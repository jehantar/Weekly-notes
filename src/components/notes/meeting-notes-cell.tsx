"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import { MarkdownBlock } from "@/components/shared/markdown-render";
import type { Meeting, MeetingNote } from "@/lib/types/database";
import { toast } from "sonner";

type MeetingNoteEditorProps = {
  meeting: Meeting;
  note?: MeetingNote;
  onClose: () => void;
};

function MeetingNoteEditor({ meeting, note, onClose }: MeetingNoteEditorProps) {
  const { upsertMeetingNote } = useWeek();
  const [sourceUrl, setSourceUrl] = useState(note?.source_url ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const saved = await upsertMeetingNote(meeting.id, {
      sourceUrl,
      content,
      sourceTitle: meeting.title ? `${meeting.title} notes` : null,
    });
    setSaving(false);
    if (saved) onClose();
  };

  return (
    <div
      className="mt-2 rounded-[6px] border p-2 space-y-2"
      style={{
        borderColor: "var(--border-card)",
        backgroundColor: "var(--bg-column)",
      }}
    >
      <input
        value={sourceUrl}
        onChange={(event) => setSourceUrl(event.target.value)}
        placeholder="Google Doc URL"
        className="w-full rounded-[4px] border px-2 py-1 text-[11px] outline-none"
        style={{
          borderColor: "var(--border-card)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-primary)",
        }}
      />
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Paste Gemini notes here..."
        rows={7}
        className="w-full resize-y rounded-[4px] border px-2 py-1 text-[11px] leading-4 outline-none"
        style={{
          borderColor: "var(--border-card)",
          backgroundColor: "var(--bg-card)",
          color: "var(--text-primary)",
        }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-[11px]"
          style={{ color: "var(--text-secondary)" }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-[4px] px-2 py-1 text-[11px] font-medium disabled:opacity-50"
          style={{
            backgroundColor: "var(--accent-purple)",
            color: "#fff",
          }}
        >
          {saving ? "Saving..." : note ? "Refresh notes" : "Attach notes"}
        </button>
      </div>
    </div>
  );
}

type MeetingNoteCardProps = {
  meeting: Meeting;
  note?: MeetingNote;
  autoEdit?: boolean;
  onAddNext: () => void;
  onBackspace: () => void;
};

function MeetingNoteCard({ meeting, note, autoEdit, onAddNext, onBackspace }: MeetingNoteCardProps) {
  const { updateMeeting, deleteMeeting, deleteMeetingNote, week } = useWeek();
  const { addTask, linkMeeting } = useTasks();
  const [editingNote, setEditingNote] = useState(false);

  const importedLabel = useMemo(() => {
    if (!note?.imported_at) return null;
    return format(new Date(note.imported_at), "MMM d, h:mm a");
  }, [note?.imported_at]);

  const handleSaveTitle = (title: string) => {
    if (!title.trim()) {
      deleteMeeting(meeting.id);
      return;
    }
    updateMeeting(meeting.id, title);
  };

  const handleCreateTask = async () => {
    const title = meeting.title.trim();
    if (!title) return;
    const task = await addTask(title, "backlog");
    if (task) {
      await linkMeeting(task.id, meeting.id, title, week?.week_start ?? null);
      toast.success("Task created from meeting");
    }
  };

  return (
    <article
      className="rounded-[6px] border p-2"
      style={{
        borderColor: "var(--border-card)",
        backgroundColor: "color-mix(in srgb, var(--bg-card) 88%, var(--bg-hover))",
      }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 select-none text-[11px]" style={{ color: "var(--text-placeholder)" }}>
          &bull;
        </span>
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={meeting.title}
            onSave={handleSaveTitle}
            placeholder="Meeting title..."
            autoEdit={autoEdit}
            onEnter={onAddNext}
            onBackspace={onBackspace}
            renderView={(value) => (
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {value}
              </span>
            )}
          />
          {importedLabel && (
            <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-placeholder)" }}>
              Imported {importedLabel}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {note && (
            <button
              type="button"
              onClick={() => setEditingNote((value) => !value)}
              className="text-[11px]"
              style={{ color: "var(--text-secondary)" }}
              aria-label="Refresh Gemini notes"
            >
              Refresh
            </button>
          )}
          <button
            type="button"
            onClick={handleCreateTask}
            className="text-xs"
            style={{ color: "var(--text-placeholder)" }}
            aria-label="Create task from meeting"
          >
            &rarr;
          </button>
          <button
            type="button"
            onClick={() => deleteMeeting(meeting.id)}
            className="text-xs"
            style={{ color: "var(--text-placeholder)" }}
            aria-label="Delete meeting"
          >
            &times;
          </button>
        </div>
      </div>

      {note && !editingNote && (
        <div className="mt-2 space-y-2">
          <div
            className="max-h-56 overflow-y-auto rounded-[4px] border px-2 py-1.5 text-[11px] leading-4"
            style={{
              borderColor: "var(--border-card)",
              backgroundColor: "var(--bg-column)",
              color: "var(--text-secondary)",
            }}
          >
            <MarkdownBlock content={note.content} />
          </div>
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <a
              href={note.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate underline"
              style={{ color: "var(--accent-link)" }}
            >
              Open Google Doc
            </a>
            <button
              type="button"
              onClick={() => deleteMeetingNote(meeting.id)}
              className="shrink-0"
              style={{ color: "var(--text-placeholder)" }}
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {!note && !editingNote && (
        <button
          type="button"
          onClick={() => setEditingNote(true)}
          className="mt-2 w-full rounded-[4px] border border-dashed px-2 py-2 text-left text-[11px]"
          style={{
            borderColor: "var(--border-card)",
            color: "var(--text-placeholder)",
          }}
        >
          Attach Gemini notes
        </button>
      )}

      {editingNote && (
        <MeetingNoteEditor
          meeting={meeting}
          note={note}
          onClose={() => setEditingNote(false)}
        />
      )}
    </article>
  );
}

export function MeetingNotesCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { meetings, meetingNotes, addMeeting, deleteMeeting } = useWeek();
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const dayMeetings = meetings
    .filter((meeting) => meeting.day_of_week === dayOfWeek)
    .sort((a, b) => a.sort_order - b.sort_order);

  const notesByMeetingId = useMemo(() => {
    return new Map(meetingNotes.map((note) => [note.meeting_id, note]));
  }, [meetingNotes]);

  const handleAdd = async () => {
    const meeting = await addMeeting(dayOfWeek, "");
    if (meeting) setEditingMeetingId(meeting.id);
  };

  const handleBackspace = (meetingId: string) => {
    const index = dayMeetings.findIndex((meeting) => meeting.id === meetingId);
    deleteMeeting(meetingId);
    if (index > 0) {
      setEditingMeetingId(dayMeetings[index - 1].id);
    } else {
      setEditingMeetingId(null);
    }
  };

  return (
    <div className="space-y-2 text-xs">
      {dayMeetings.length === 0 ? (
        <div
          className="rounded-[6px] border border-dashed px-3 py-4 text-center text-[11px]"
          style={{
            borderColor: "var(--border-card)",
            color: "var(--text-placeholder)",
          }}
        >
          No meetings yet
        </div>
      ) : (
        dayMeetings.map((meeting) => (
          <MeetingNoteCard
            key={meeting.id}
            meeting={meeting}
            note={notesByMeetingId.get(meeting.id)}
            autoEdit={meeting.id === editingMeetingId}
            onAddNext={handleAdd}
            onBackspace={() => handleBackspace(meeting.id)}
          />
        ))
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="text-[11px]"
        style={{ color: "var(--text-secondary)" }}
      >
        + Add meeting
      </button>
    </div>
  );
}
