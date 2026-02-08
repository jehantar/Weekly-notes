"use client";

import { DAYS_OF_WEEK } from "@/lib/constants";
import { DayHeader } from "./day-header";
import { RowLabel } from "./row-label";
import { MeetingsCell } from "@/components/meetings/meetings-cell";
import { ActionItemsCell } from "@/components/action-items/action-items-cell";
import { NotesCell } from "@/components/notes/notes-cell";

export function WeekGrid({ monday }: { monday: Date }) {
  return (
    <div className="grid grid-cols-[120px_repeat(5,1fr)] border-t border-l border-gray-300 w-full">
      {/* Header row */}
      <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-xs font-bold text-gray-500">
        Day
      </div>
      {DAYS_OF_WEEK.map((day) => (
        <DayHeader key={day} monday={monday} dayOfWeek={day} />
      ))}

      {/* Meetings row */}
      <RowLabel label="Key Meetings" />
      {DAYS_OF_WEEK.map((day) => (
        <MeetingsCell key={day} dayOfWeek={day} />
      ))}

      {/* Action Items row */}
      <RowLabel label="Action Items" />
      {DAYS_OF_WEEK.map((day) => (
        <ActionItemsCell key={day} dayOfWeek={day} />
      ))}

      {/* Notes row */}
      <RowLabel label="Notes" />
      {DAYS_OF_WEEK.map((day) => (
        <NotesCell key={day} dayOfWeek={day} />
      ))}
    </div>
  );
}
