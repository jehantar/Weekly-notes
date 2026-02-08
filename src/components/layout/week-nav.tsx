"use client";

import { useRouter } from "next/navigation";
import { getWeekLabel, addWeeks, formatWeekStart } from "@/lib/utils/dates";

export function WeekNav({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  const router = useRouter();

  const navigateWeek = (offset: number) => {
    const target = addWeeks(monday, offset);
    router.push(`/week/${formatWeekStart(target)}`);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigateWeek(-1)}
        className="px-2 py-1 border border-gray-300 hover:bg-gray-50 text-sm"
        aria-label="Previous week"
      >
        &larr; Prev
      </button>
      <span className="text-base font-bold min-w-[140px] text-center">
        {getWeekLabel(monday)}
      </span>
      <button
        onClick={() => navigateWeek(1)}
        className="px-2 py-1 border border-gray-300 hover:bg-gray-50 text-sm"
        aria-label="Next week"
      >
        Next &rarr;
      </button>
    </div>
  );
}
