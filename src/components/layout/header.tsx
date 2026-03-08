"use client";

import { Component, type ReactNode } from "react";
import { WeekNav } from "./week-nav";
import { CalendarPicker } from "./calendar-picker";
import { GranolaSyncButton } from "@/components/granola/granola-sync-button";
import { useTasks } from "@/components/providers/tasks-provider";
import { useTheme } from "@/components/providers/theme-provider";

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

export type ViewTab = "notes" | "tasks" | "updates";

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
          <ThemeToggle />
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
      <div className="px-4 flex gap-0 items-center">
        {(["notes", "tasks", "updates"] as const).map((tab) => (
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
        {activeTab === "tasks" && <TaskStats />}
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="w-7 h-7 flex items-center justify-center transition-colors duration-150"
      style={{ border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

function TaskStats() {
  const { tasks } = useTasks();
  // Count only non-backlog tasks
  const activeTasks = tasks.filter((t) => t.status !== "backlog");
  const doneCount = activeTasks.filter((t) => t.status === "done").length;
  const total = activeTasks.length;

  if (total === 0) return null;

  return (
    <span
      className="ml-auto text-[11px] tabular-nums"
      style={{ color: 'var(--text-placeholder)' }}
    >
      {doneCount} of {total} done
    </span>
  );
}
