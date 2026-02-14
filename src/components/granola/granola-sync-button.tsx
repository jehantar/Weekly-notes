"use client";

import { useState, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { toast } from "sonner";

export function GranolaSyncButton({ weekStart }: { weekStart: string }) {
  const { weekId, refreshMeetings } = useWeek();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/granola/status")
      .then((res) => res.json())
      .then((data) => setConnected(data.connected ?? false))
      .catch(() => setConnected(false));
  }, []);

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/granola/connect", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to connect");
      }
      const { authorizationUrl } = await res.json();
      window.location.href = authorizationUrl;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to connect to Granola"
      );
      setConnecting(false);
    }
  };

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

  const isLoading = connected === null;
  const label = isLoading
    ? "Granola..."
    : !connected
      ? connecting
        ? "Connecting..."
        : "Connect Granola"
      : syncing
        ? "Syncing..."
        : "Sync Granola";

  const handleClick = !connected ? handleConnect : handleSync;
  const isDisabled = isLoading || connecting || syncing || (connected && !weekId);

  return (
    <button
      onClick={handleClick}
      disabled={!!isDisabled}
      className="text-sm px-3 py-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
      style={{ border: '1px solid var(--border-card)' }}
    >
      {label}
    </button>
  );
}
