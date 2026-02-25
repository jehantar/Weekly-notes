"use client";

import { DAYS_OF_WEEK } from "@/lib/constants";
import { DayCard } from "./day-card";

export function DayCards({ monday }: { monday: Date }) {
  return (
    <div className="flex gap-1 h-full">
      {DAYS_OF_WEEK.map((day, i) => (
        <DayCard key={day} monday={monday} dayOfWeek={day} index={i} />
      ))}
    </div>
  );
}
