"use client";

import { useState, useRef, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import type { Task } from "@/lib/types/database";

export function MeetingTagInput({ task, alwaysVisible }: { task: Task; alwaysVisible?: boolean }) {
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
    setOpen(false);
    setFilter("");
  };

  // Show existing tag (clickable to change) or add button
  return (
    <div className="relative" ref={dropdownRef}>
      {task.meeting_title ? (
        <span
          className="inline-flex items-center gap-0.5 text-[10px] px-1 py-0.5 cursor-pointer"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-purple) 12%, transparent)',
            color: 'var(--accent-purple)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          #{task.meeting_title}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnlink();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="hover:opacity-70 leading-none ml-0.5"
          >
            &times;
          </button>
        </span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className={`text-[10px] transition-opacity ${alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          style={{ color: 'var(--text-placeholder)' }}
        >
          {alwaysVisible ? '+ Add meeting' : '#'}
        </button>
      )}

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-48 z-50 py-1 overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
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
                  className="w-full text-left px-2 py-1.5 text-[11px] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
