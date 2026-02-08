"use client";

import { useWeek } from "@/components/providers/week-provider";
import { MeetingItem } from "./meeting-item";

export function MeetingsCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { meetings, addMeeting } = useWeek();
  const dayMeetings = meetings
    .filter((m) => m.day_of_week === dayOfWeek)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = async () => {
    await addMeeting(dayOfWeek, "New meeting");
  };

  return (
    <div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
      <ul className="space-y-1">
        {dayMeetings.map((meeting) => (
          <MeetingItem key={meeting.id} meeting={meeting} />
        ))}
      </ul>
      <button
        onClick={handleAdd}
        className="text-gray-300 hover:text-gray-500 mt-1 text-xs"
      >
        + Add meeting
      </button>
    </div>
  );
}
