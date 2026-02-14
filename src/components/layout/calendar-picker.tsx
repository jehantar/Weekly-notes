"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import { getMonday, formatWeekStart } from "@/lib/utils/dates";

export function CalendarPicker() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const handleSelect = (day: Date | undefined) => {
    if (!day) return;
    const monday = getMonday(day);
    router.push(`/week/${formatWeekStart(monday)}`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="px-2 py-1 text-sm transition-colors duration-150 hover:bg-gray-100"
        style={{ border: '1px solid var(--border-card)' }}
        aria-label="Open calendar"
      >
        Cal
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 shadow-lg"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <DayPicker
            mode="single"
            onSelect={handleSelect}
            weekStartsOn={1}
            styles={{
              caption: { fontFamily: "monospace", fontSize: "0.875rem" },
              day: { fontFamily: "monospace", fontSize: "0.75rem" },
            }}
          />
        </div>
      )}
    </div>
  );
}
