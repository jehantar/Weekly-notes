"use client";

import { useState, useCallback } from "react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import { DayCard } from "./day-card";

export function DayCards({ monday }: { monday: Date }) {
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  const handleFocusDay = useCallback((day: number) => setFocusedDay(day), []);
  const handleBlurDay = useCallback(() => setFocusedDay(null), []);

  return (
    <div className="flex gap-1 h-full">
      {DAYS_OF_WEEK.map((day, i) => (
        <DayCard
          key={day}
          monday={monday}
          dayOfWeek={day}
          index={i}
          isCollapsed={focusedDay !== null && focusedDay !== day}
          onExpand={() => setFocusedDay(day)}
          onFocusNotes={handleFocusDay}
          onBlurNotes={handleBlurDay}
        />
      ))}
    </div>
  );
}
