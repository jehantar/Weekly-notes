"use client";

import { useState, useRef, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import type { Task } from "@/lib/types/database";

export function MeetingTagInput({ task }: { task: Task }) {
  const { meetings, week } = useWeek();
  const { linkMeeting } = useTasks();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const weekStart = week?.week_start ?? null;

  const filtered = meetings.filter((m) =>
    m.title.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (meetingId: string, title: string) => {
    linkMeeting(task.id, meetingId, title, weekStart);
    setOpen(false);
    setFilter("");
  };

  const handleUnlink = () => {
    linkMeeting(task.id, null, null, null);
  };

  // Show existing tag
  if (task.meeting_title) {
    return (
      <div className="mt-1 flex items-center gap-1">
        <span
          className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)',
            color: 'var(--accent-purple)',
          }}
        >
          #{task.meeting_title}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnlink();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:opacity-70 leading-none"
          >
            &times;
          </button>
        </span>
      </div>
    );
  }

  // Show link button + dropdown
  return (
    <div className="relative mt-1" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--accent-purple)' }}
      >
        # Link
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 w-48 z-50 py-1 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            boxShadow: 'var(--shadow-card-hover)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="px-2 pb-1">
            <input
              ref={inputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter meetings..."
              className="w-full text-[11px] bg-transparent outline-none py-1"
              style={{
                color: 'var(--text-primary)',
                borderBottom: '1px solid var(--border-card)',
              }}
            />
          </div>
          <div className="max-h-32 overflow-y-auto">
            {filtered.length === 0 ? (
              <div
                className="px-2 py-2 text-[11px]"
                style={{ color: 'var(--text-placeholder)' }}
              >
                No meetings found
              </div>
            ) : (
              filtered.map((meeting) => (
                <button
                  key={meeting.id}
                  onClick={() => handleSelect(meeting.id, meeting.title)}
                  className="w-full text-left px-2 py-1.5 text-[11px] transition-colors hover:bg-black/5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {meeting.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
