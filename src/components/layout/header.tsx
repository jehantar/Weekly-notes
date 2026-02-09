"use client";

import { Component, type ReactNode } from "react";
import { WeekNav } from "./week-nav";
import { CalendarPicker } from "./calendar-picker";
import { SearchBar } from "./search-bar";
import { GranolaSyncButton } from "@/components/granola/granola-sync-button";

class GranolaErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <span className="text-xs text-red-500" title={this.state.error}>
          Granola error
        </span>
      );
    }
    return this.props.children;
  }
}

export function Header({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  return (
    <header className="border-b border-gray-300 px-4 py-2 flex items-center gap-4">
      <WeekNav weekStart={weekStart} monday={monday} />
      <div className="flex items-center gap-2 ml-auto">
        <GranolaErrorBoundary>
          <GranolaSyncButton weekStart={weekStart} />
        </GranolaErrorBoundary>
        <CalendarPicker />
        <SearchBar />
      </div>
    </header>
  );
}
