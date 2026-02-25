"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header, type ViewTab } from "@/components/layout/header";
import { DayCards } from "@/components/layout/day-cards";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { CreateWeekModal } from "@/components/modals/create-week-modal";
import { SearchCommand } from "@/components/layout/search-command";
import { parseWeekStart, addWeeks as addWeeksUtil, formatWeekStart } from "@/lib/utils/dates";
import { toast } from "sonner";

export function WeekClient({
  weekStart,
  weekExists,
}: {
  weekStart: string;
  weekExists: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const monday = parseWeekStart(weekStart);
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextWeekStart = formatWeekStart(addWeeksUtil(monday, 1));

  // Tab state from query param
  const viewParam = searchParams.get("view") as ViewTab | null;
  const [activeTab, setActiveTab] = useState<ViewTab>(viewParam === "tasks" ? "tasks" : "notes");

  const handleTabChange = useCallback((tab: ViewTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "notes") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", tab);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleNavigateForward = () => {
    router.push(`/week/${nextWeekStart}${activeTab === "tasks" ? "?view=tasks" : ""}`);
  };

  useEffect(() => {
    if (!weekExists) {
      setShowCreateModal(true);
    }
  }, [weekExists]);

  // Handle Granola OAuth redirect params
  useEffect(() => {
    const granola = searchParams.get("granola");
    const granolaError = searchParams.get("granola_error");

    if (granola === "connected") {
      toast.success("Granola connected successfully");
      window.history.replaceState({}, "", `/week/${weekStart}`);
    } else if (granolaError) {
      toast.error(`Granola: ${granolaError}`);
      window.history.replaceState({}, "", `/week/${weekStart}`);
    }
  }, [searchParams, weekStart]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Arrow key week navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        router.push(`/week/${formatWeekStart(addWeeksUtil(monday, -1))}${activeTab === "tasks" ? "?view=tasks" : ""}`);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavigateForward();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [monday, router, handleNavigateForward, activeTab]);

  const handleSearchNavigateToTasks = useCallback(() => {
    handleTabChange("tasks");
  }, [handleTabChange]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        weekStart={weekStart}
        monday={monday}
        onSearchOpen={() => setSearchOpen(true)}
        onNavigateForward={handleNavigateForward}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <main className="flex-1 p-4 overflow-hidden">
        {activeTab === "notes" ? (
          <DayCards monday={monday} />
        ) : (
          <KanbanBoard />
        )}
      </main>
      {showCreateModal && (
        <CreateWeekModal
          weekStart={weekStart}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {searchOpen && (
        <SearchCommand
          onClose={() => setSearchOpen(false)}
          onNavigateToTasks={handleSearchNavigateToTasks}
        />
      )}
    </div>
  );
}
