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

export type ViewTab = "notes" | "tasks";

export function Header({
  weekStart,
  monday,
  onSearchOpen,
  onNavigateForward,
  activeTab,
  onTabChange,
}: {
  weekStart: string;
  monday: Date;
  onSearchOpen: () => void;
  onNavigateForward?: () => void;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
}) {
  return (
    <header style={{ borderBottom: '1px solid var(--border-card)' }}>
      <div className="px-4 py-2 flex items-center gap-4">
        <WeekNav weekStart={weekStart} monday={monday} onNavigateForward={onNavigateForward} />
        <div className="flex items-center gap-2 ml-auto">
          <GranolaErrorBoundary>
            <GranolaSyncButton weekStart={weekStart} />
          </GranolaErrorBoundary>
          <CalendarPicker />
          <button
            onClick={onSearchOpen}
            className="px-2 py-1 text-sm flex items-center gap-1.5 transition-colors duration-150"
            style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="text-[10px] ml-1" style={{ color: 'var(--text-placeholder)' }}>&#x2318;K</kbd>
          </button>
        </div>
      </div>
      {/* Tab bar */}
      <div className="px-4 flex gap-0">
        {(["notes", "tasks"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors duration-150"
            style={{
              color: activeTab === tab ? 'var(--accent-purple)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 700 : 500,
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </header>
  );
}
