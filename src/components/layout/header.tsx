"use client";

import { Component, type ReactNode } from "react";
import { WeekNav } from "./week-nav";
import { CalendarPicker } from "./calendar-picker";
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
  onSearchOpen,
  onNavigateForward,
}: {
  weekStart: string;
  monday: Date;
  onSearchOpen: () => void;
  onNavigateForward?: () => void;
}) {
  return (
    <header className="px-4 py-2 flex items-center gap-4" style={{ borderBottom: '1px solid var(--border-card)' }}>
      <WeekNav weekStart={weekStart} monday={monday} onNavigateForward={onNavigateForward} />
      <div className="flex items-center gap-2 ml-auto">
        <GranolaErrorBoundary>
          <GranolaSyncButton weekStart={weekStart} />
        </GranolaErrorBoundary>
        <CalendarPicker />
        <button
          onClick={onSearchOpen}
          className="px-2 py-1 text-sm flex items-center gap-1.5 transition-colors duration-150 hover:bg-gray-100"
          style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
          <kbd className="text-[10px] ml-1" style={{ color: 'var(--text-placeholder)' }}>&#x2318;K</kbd>
        </button>
      </div>
    </header>
  );
}
