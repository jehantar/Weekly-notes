"use client";

import { useWeek } from "@/components/providers/week-provider";

export function TagAutocomplete({
  dayOfWeek,
  prefix,
  onSelect,
}: {
  dayOfWeek: number;
  prefix: string;
  onSelect: (meetingId: string, meetingTitle: string) => void;
}) {
  const { meetings } = useWeek();
  const dayMeetings = meetings.filter(
    (m) =>
      m.day_of_week === dayOfWeek &&
      m.title.toLowerCase().includes(prefix.toLowerCase())
  );

  if (dayMeetings.length === 0) return null;

  return (
    <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-300 text-xs max-w-60">
      {dayMeetings.map((m) => (
        <button
          key={m.id}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(m.id, m.title);
          }}
          className="block w-full text-left px-3 py-1.5 hover:bg-purple-50 truncate"
        >
          #{m.title}
        </button>
      ))}
    </div>
  );
}
