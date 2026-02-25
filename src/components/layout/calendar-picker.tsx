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
        className="px-2 py-1 text-sm transition-colors duration-150"
        style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
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
              caption: { fontSize: "0.875rem", color: 'var(--text-primary)' },
              day: { fontSize: "0.75rem", color: 'var(--text-primary)' },
            }}
          />
        </div>
      )}
    </div>
  );
}
