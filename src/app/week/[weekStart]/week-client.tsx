"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { WeekGrid } from "@/components/grid/week-grid";
import { CreateWeekModal } from "@/components/modals/create-week-modal";
import { parseWeekStart } from "@/lib/utils/dates";

export function WeekClient({
  weekStart,
  weekExists,
  granolaEnabled,
}: {
  weekStart: string;
  weekExists: boolean;
  granolaEnabled: boolean;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const monday = parseWeekStart(weekStart);

  useEffect(() => {
    if (!weekExists) {
      setShowCreateModal(true);
    }
  }, [weekExists]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header weekStart={weekStart} monday={monday} granolaEnabled={granolaEnabled} />
      <main className="flex-1 p-4">
        <WeekGrid monday={monday} />
      </main>
      {showCreateModal && (
        <CreateWeekModal
          weekStart={weekStart}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
