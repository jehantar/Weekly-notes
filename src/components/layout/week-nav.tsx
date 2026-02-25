"use client";

import { useRouter } from "next/navigation";
import { getWeekLabel, addWeeks, formatWeekStart, getCurrentWeekStart } from "@/lib/utils/dates";

export function WeekNav({
  weekStart,
  monday,
  onNavigateForward,
}: {
  weekStart: string;
  monday: Date;
  onNavigateForward?: () => void;
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
        className="px-2 py-1 text-sm transition-colors duration-150"
        style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-label="Previous week"
      >
        &larr; Prev
      </button>
      <span className="text-base font-bold min-w-[140px] text-center">
        {getWeekLabel(monday)}
      </span>
      <button
        onClick={() => onNavigateForward ? onNavigateForward() : navigateWeek(1)}
        className="px-2 py-1 text-sm transition-colors duration-150"
        style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        aria-label="Next week"
      >
        Next &rarr;
      </button>
      <button
        onClick={() => router.push(`/week/${getCurrentWeekStart()}`)}
        className="px-2 py-1 text-xs transition-colors duration-150"
        style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Today
      </button>
    </div>
  );
}
