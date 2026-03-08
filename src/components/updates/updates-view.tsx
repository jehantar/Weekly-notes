"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { generateWeekSummary } from "@/lib/utils/generate-summary";
import { SummaryList } from "./summary-list";
import { SummaryMarkdown } from "./summary-markdown";
import { AUTOSAVE_DELAY } from "@/lib/constants";
import { addDays, formatWeekRange } from "@/lib/utils/dates";

export function UpdatesView({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  const { meetings, notes, summary, upsertSummary } = useWeek();
  const { tasks, tags, taskTags } = useTasks();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(summary?.content ?? "");
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const weekLabel = useMemo(() => formatWeekRange(monday), [monday]);

  const weekEnd = useMemo(() => addDays(monday, 7), [monday]);
  const completedTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!t.completed_at) return false;
        const d = new Date(t.completed_at);
        return d >= monday && d < weekEnd;
      }),
    [tasks, monday, weekEnd]
  );

  const handleGenerate = useCallback(() => {
    const content = generateWeekSummary({
      meetings,
      notes,
      completedTasks,
      tags,
      taskTags,
    });
    setEditContent(content);
    setEditing(true);
    upsertSummary(content);
  }, [meetings, notes, completedTasks, tags, taskTags, upsertSummary]);

  const handleEdit = useCallback(() => {
    setEditContent(summary?.content ?? "");
    setEditing(true);
  }, [summary?.content]);

  const handleContentChange = useCallback(
    (value: string) => {
      setEditContent(value);
      if (autosaveRef.current) clearTimeout(autosaveRef.current);
      autosaveRef.current = setTimeout(() => {
        upsertSummary(value);
      }, AUTOSAVE_DELAY);
    },
    [upsertSummary]
  );

  const handleDoneEditing = useCallback(() => {
    if (autosaveRef.current) {
      clearTimeout(autosaveRef.current);
      upsertSummary(editContent);
    }
    setEditing(false);
  }, [editContent, upsertSummary]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Current week summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {weekLabel}
            </h2>
            <div className="flex items-center gap-2">
              {summary && !editing && (
                <button
                  onClick={handleEdit}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
                >
                  Edit
                </button>
              )}
              {editing && (
                <button
                  onClick={handleDoneEditing}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)]"
                  style={{ color: "var(--accent-purple)", border: "1px solid var(--accent-purple)" }}
                >
                  Done
                </button>
              )}
              <button
                onClick={handleGenerate}
                className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
                style={{ color: "var(--text-secondary)", border: "1px solid var(--border-card)" }}
              >
                {summary ? "Regenerate" : "Generate Summary"}
              </button>
            </div>
          </div>

          {editing ? (
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full min-h-[300px] p-3 text-xs font-mono resize-y outline-none focus:border-[var(--accent-purple)]"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            />
          ) : summary ? (
            <div
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div className="text-xs space-y-3" style={{ color: "var(--text-primary)" }}>
                <SummaryMarkdown content={summary.content} />
              </div>
            </div>
          ) : (
            <div
              className="p-8 flex flex-col items-center justify-center gap-2"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px dashed var(--border-card)",
              }}
            >
              <p className="text-xs" style={{ color: "var(--text-placeholder)" }}>
                No summary for this week yet
              </p>
              <button
                onClick={handleGenerate}
                className="text-xs px-3 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)]"
                style={{
                  color: "var(--accent-purple)",
                  border: "1px solid var(--accent-purple)",
                }}
              >
                Generate Summary
              </button>
            </div>
          )}
        </div>

        {/* Past summaries */}
        <SummaryList currentWeekStart={weekStart} />
      </div>
    </div>
  );
}
