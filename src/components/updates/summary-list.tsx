"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import type { WeekSummary } from "@/lib/types/database";
import { parseWeekStart, formatWeekRange } from "@/lib/utils/dates";
import { SummaryMarkdown } from "./summary-markdown";

export function SummaryList({ currentWeekStart }: { currentWeekStart: string }) {
  const supabase = useSupabase();
  const [summaries, setSummaries] = useState<WeekSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("week_summaries")
        .select("id, week_start, updated_at, content")
        .eq("user_id", user.id)
        .neq("week_start", currentWeekStart)
        .order("week_start", { ascending: false })
        .limit(20);

      setSummaries((data ?? []) as WeekSummary[]);
      setLoading(false);
    }
    load();
  }, [supabase, currentWeekStart]);

  const weekLabels = useMemo(
    () =>
      Object.fromEntries(
        summaries.map((s) => [s.id, formatWeekRange(parseWeekStart(s.week_start))])
      ),
    [summaries]
  );

  if (loading) {
    return (
      <div className="text-xs py-4" style={{ color: "var(--text-placeholder)" }}>
        Loading past summaries...
      </div>
    );
  }

  if (summaries.length === 0) {
    return null;
  }

  return (
    <div>
      <h3
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: "var(--text-placeholder)" }}
      >
        Past Summaries
      </h3>
      <div className="space-y-1">
        {summaries.map((s) => {
          const isExpanded = expandedId === s.id;
          return (
            <div key={s.id} style={{ border: "1px solid var(--border-card)" }}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : s.id)}
                className="w-full px-3 py-2 flex items-center justify-between text-left transition-colors hover:bg-[var(--bg-hover)]"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                  {weekLabels[s.id]}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
                  {isExpanded ? "\u25B2" : "\u25BC"}
                </span>
              </button>
              {isExpanded && (
                <div
                  className="px-3 py-3 text-xs space-y-2"
                  style={{
                    borderTop: "1px solid var(--border-card)",
                    backgroundColor: "var(--bg-column)",
                  }}
                >
                  <SummaryMarkdown content={s.content} compact />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
