"use client";

import { useState } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { toast } from "sonner";

export function GranolaSyncButton({ weekStart }: { weekStart: string }) {
  const { weekId, refreshMeetings } = useWeek();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    if (!weekId || syncing) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/granola/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, weekId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      const { matched } = await res.json();
      toast.success(
        matched > 0
          ? `Synced ${matched} meeting${matched === 1 ? "" : "s"} from Granola`
          : "No matching Granola notes found"
      );
      if (matched > 0) {
        await refreshMeetings();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to sync Granola notes"
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncing || !weekId}
      className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {syncing ? "Syncing..." : "Sync Granola"}
    </button>
  );
}
