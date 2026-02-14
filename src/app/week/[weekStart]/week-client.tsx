"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { DayCards } from "@/components/layout/day-cards";
import { CreateWeekModal } from "@/components/modals/create-week-modal";
import { SearchCommand } from "@/components/layout/search-command";
import { parseWeekStart } from "@/lib/utils/dates";
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
      // Clean up URL params
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header weekStart={weekStart} monday={monday} onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 p-4 overflow-hidden">
        <DayCards monday={monday} />
      </main>
      {showCreateModal && (
        <CreateWeekModal
          weekStart={weekStart}
          onClose={() => setShowCreateModal(false)}
        />
      )}
      {searchOpen && <SearchCommand onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
