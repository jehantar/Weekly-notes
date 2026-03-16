"use client";

import { addDays, format } from "date-fns";
import { isDayToday } from "@/lib/utils/dates";
import { DAY_LABELS } from "@/lib/constants";
import { MeetingsCell } from "@/components/meetings/meetings-cell";
import { NotesCell } from "@/components/notes/notes-cell";

export function DayCard({
  monday,
  dayOfWeek,
  index,
  isCollapsed,
  onExpand,
  onFocusNotes,
  onBlurNotes,
}: {
  monday: Date;
  dayOfWeek: number;
  index: number;
  isCollapsed?: boolean;
  onExpand?: () => void;
  onFocusNotes?: (day: number) => void;
  onBlurNotes?: () => void;
}) {
  const isToday = isDayToday(monday, dayOfWeek);
  const date = addDays(monday, dayOfWeek - 1);
  const dayName = DAY_LABELS[dayOfWeek - 1];
  const dateNum = format(date, "d");

  if (isCollapsed) {
    return (
      <div
        onClick={onExpand}
        className="flex flex-col items-center cursor-pointer select-none"
        style={{
          width: '36px',
          minWidth: '36px',
          backgroundColor: 'var(--bg-card)',
          border: `1px solid ${isToday ? 'var(--accent-purple)' : 'var(--border-card)'}`,
          transition: 'all 200ms ease-out',
        }}
      >
        <div className="pt-3 pb-2">
          <span
            className="text-sm font-bold"
            style={{ color: isToday ? 'var(--accent-purple)' : 'var(--text-primary)' }}
          >
            {dateNum}
          </span>
        </div>
        <div
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{
            color: 'var(--text-placeholder)',
            writingMode: 'vertical-rl',
          }}
        >
          {dayName}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-w-0 flex-1 overflow-y-auto group"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${isToday ? 'var(--accent-purple)' : 'var(--border-card)'}`,
        maxHeight: '75vh',
        transition: 'all 200ms ease-out',
      }}
    >
      {/* Day Header */}
      <div
        className="px-3 py-2 border-b flex items-baseline gap-2"
        style={{ borderColor: 'var(--border-card)' }}
      >
        <span className="text-lg font-bold" style={{ color: isToday ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
          {dateNum}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {dayName}
        </span>
      </div>

      {/* Meetings Section */}
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-card)' }}>
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-placeholder)' }}>
          Meetings
        </div>
        <MeetingsCell dayOfWeek={dayOfWeek} />
      </div>

      {/* Notes Section */}
      <div className="px-3 py-2 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-placeholder)' }}>
          Notes
        </div>
        <NotesCell
          dayOfWeek={dayOfWeek}
          onFocusDay={onFocusNotes}
          onBlurDay={onBlurNotes}
        />
      </div>
    </div>
  );
}
