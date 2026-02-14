"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { DayCards } from "@/components/layout/day-cards";
import { CreateWeekModal } from "@/components/modals/create-week-modal";
import { ShiftItemsModal, type ShiftPayload } from "@/components/modals/shift-items-modal";
import { SearchCommand } from "@/components/layout/search-command";
import { useWeek } from "@/components/providers/week-provider";
import { useSupabase } from "@/components/providers/supabase-provider";
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
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shifting, setShifting] = useState(false);
  const monday = parseWeekStart(weekStart);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { actionItems, removeActionItems } = useWeek();
  const supabase = useSupabase();

  const nextWeekStart = formatWeekStart(addWeeksUtil(monday, 1));
  const uncompletedItems = actionItems.filter((ai) => !ai.is_done);

  const handleNavigateForward = () => {
    if (weekExists && uncompletedItems.length > 0) {
      setShowShiftModal(true);
    } else {
      router.push(`/week/${nextWeekStart}`);
    }
  };

  const handleShiftConfirm = async (items: ShiftPayload[]) => {
    if (items.length === 0) {
      setShowShiftModal(false);
      router.push(`/week/${nextWeekStart}`);
      return;
    }

    setShifting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setShifting(false); return; }

    const { data: targetWeek } = await supabase
      .from("weeks")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", nextWeekStart)
      .single();

    if (!targetWeek) {
      toast.error("Target week not found");
      setShifting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("action_items")
      .insert(
        items.map((item, i) => ({
          week_id: targetWeek.id,
          day_of_week: item.day_of_week,
          content: item.content,
          priority: item.priority,
          sort_order: i,
          meeting_id: null as string | null,
        }))
      );

    if (insertError) {
      toast.error("Failed to shift items");
      setShifting(false);
      return;
    }

    const ids = items.map((item) => item.id);
    const { error: deleteError } = await supabase
      .from("action_items")
      .delete()
      .in("id", ids);

    if (deleteError) {
      toast.error("Failed to remove shifted items from current week");
      setShifting(false);
      return;
    }

    removeActionItems(ids);
    setShowShiftModal(false);
    setShifting(false);
    router.push(`/week/${nextWeekStart}`);
  };

  const handleShiftSkip = () => {
    setShowShiftModal(false);
    router.push(`/week/${nextWeekStart}`);
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

  // Arrow key week navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        router.push(`/week/${formatWeekStart(addWeeksUtil(monday, -1))}`);
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavigateForward();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [monday, router, handleNavigateForward]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header weekStart={weekStart} monday={monday} onSearchOpen={() => setSearchOpen(true)} onNavigateForward={handleNavigateForward} />
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
      {showShiftModal && (
        <ShiftItemsModal
          items={uncompletedItems}
          onConfirm={handleShiftConfirm}
          onSkip={handleShiftSkip}
          shifting={shifting}
        />
      )}
    </div>
  );
}
