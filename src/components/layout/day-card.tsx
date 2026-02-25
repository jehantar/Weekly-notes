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
}: {
  monday: Date;
  dayOfWeek: number;
  index: number;
}) {
  const isToday = isDayToday(monday, dayOfWeek);
  const date = addDays(monday, dayOfWeek - 1);
  const dayName = DAY_LABELS[dayOfWeek - 1];
  const dateNum = format(date, "d");

  return (
    <div
      className="flex flex-col min-w-0 flex-1 overflow-y-auto transition-all duration-200 group"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${isToday ? 'var(--accent-purple)' : 'var(--border-card)'}`,
        maxHeight: '75vh',
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
        <NotesCell dayOfWeek={dayOfWeek} />
      </div>
    </div>
  );
}
