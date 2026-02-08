"use client";

import { WeekNav } from "./week-nav";
import { CalendarPicker } from "./calendar-picker";
import { SearchBar } from "./search-bar";
import { GranolaSyncButton } from "@/components/granola/granola-sync-button";

export function Header({
  weekStart,
  monday,
  granolaEnabled,
}: {
  weekStart: string;
  monday: Date;
  granolaEnabled: boolean;
}) {
  return (
    <header className="border-b border-gray-300 px-4 py-2 flex items-center gap-4">
      <WeekNav weekStart={weekStart} monday={monday} />
      <div className="flex items-center gap-2 ml-auto">
        {granolaEnabled && <GranolaSyncButton weekStart={weekStart} />}
        <CalendarPicker />
        <SearchBar />
      </div>
    </header>
  );
}
