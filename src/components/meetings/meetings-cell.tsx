"use client";

import { useState } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { MeetingItem } from "./meeting-item";

export function MeetingsCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { meetings, addMeeting, deleteMeeting } = useWeek();
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const dayMeetings = meetings
    .filter((m) => m.day_of_week === dayOfWeek)
    .sort((a, b) => a.sort_order - b.sort_order);

  const handleAdd = async () => {
    const meeting = await addMeeting(dayOfWeek, "");
    if (meeting) {
      setEditingMeetingId(meeting.id);
    }
  };

  const handleAddNext = async () => {
    const meeting = await addMeeting(dayOfWeek, "");
    if (meeting) {
      setEditingMeetingId(meeting.id);
    }
  };

  const handleBackspace = (meetingId: string) => {
    const idx = dayMeetings.findIndex((m) => m.id === meetingId);
    // Delete the current empty meeting
    deleteMeeting(meetingId);
    // Focus the previous meeting if one exists
    if (idx > 0) {
      setEditingMeetingId(dayMeetings[idx - 1].id);
    } else {
      setEditingMeetingId(null);
    }
  };

  return (
    <div className="text-xs">
      <ul className="space-y-1">
        {dayMeetings.map((meeting) => (
          <MeetingItem
            key={meeting.id}
            meeting={meeting}
            autoEdit={meeting.id === editingMeetingId}
            onAddNext={handleAddNext}
            onBackspace={() => handleBackspace(meeting.id)}
          />
        ))}
      </ul>
      {dayMeetings.length === 0 && (
        <p className="text-center py-2 text-[10px]" style={{ color: 'var(--text-placeholder)' }}>
          No meetings
        </p>
      )}
      <button
        onClick={handleAdd}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 text-xs"
        style={{ color: 'var(--text-placeholder)' }}
      >
        + Add meeting
      </button>
    </div>
  );
}
