"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { SummaryList } from "./summary-list";
import { SummaryMarkdown } from "./summary-markdown";
import { ThreadView } from "./thread-view";
import { AUTOSAVE_DELAY, DAY_LABELS } from "@/lib/constants";
import { formatWeekRange } from "@/lib/utils/dates";
import { parseWeeklyAnalysis, type WeeklyAnalysis } from "@/lib/types/weekly-analysis";
import { toast } from "sonner";

/** Convert a WeeklyAnalysis to readable markdown for editing. One-way conversion. */
function analysisToMarkdown(analysis: WeeklyAnalysis): string {
  const sections: string[] = [];

  if (analysis.weekOverview) {
    sections.push(`> ${analysis.weekOverview}`);
  }

  for (const thread of analysis.threads) {
    sections.push(`## ${thread.name}`);
    for (const a of thread.appearances) {
      const dayLabel = DAY_LABELS[a.dayOfWeek - 1] ?? "";
      sections.push(`### ${dayLabel} · ${a.meetingTitle}`);
      for (const p of a.points) {
        sections.push(`- ${p}`);
      }
      for (const q of a.questions) {
        sections.push(`- ? ${q}`);
      }
    }
    for (const t of thread.completedTasks) {
      const dayLabel = DAY_LABELS[t.dayCompleted - 1] ?? "";
      sections.push(`- ✓ ${t.title} (completed ${dayLabel})`);
    }
  }

  if (analysis.openQuestions.length > 0) {
    sections.push("## Open Questions");
    for (const q of analysis.openQuestions) {
      const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
      sections.push(`- ? ${q.question} — ${q.source} · ${dayLabel}`);
    }
  }

  if (analysis.keyDecisions.length > 0) {
    sections.push("## Key Decisions");
    for (const d of analysis.keyDecisions) {
      const dayLabel = DAY_LABELS[d.dayOfWeek - 1] ?? "";
      sections.push(`- → ${d.decision} — ${d.source} · ${dayLabel}`);
    }
  }

  return sections.join("\n\n");
}

export function UpdatesView({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  const { meetings, notes, summary, upsertSummary, questionResolutions, resolveQuestion, unresolveQuestion, updateResolutionText } = useWeek();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [loading, setLoading] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const weekLabel = useMemo(() => formatWeekRange(monday), [monday]);
  const analysis = useMemo(
    () => (summary?.content ? parseWeeklyAnalysis(summary.content) : null),
    [summary?.content]
  );

  const subtitle = useMemo(() => {
    const meetingCount = meetings.length;
    const noteDays = notes.filter((n) => n.content.trim().length > 0).length;
    return `${meetingCount} meeting${meetingCount !== 1 ? "s" : ""} · ${noteDays} day${noteDays !== 1 ? "s" : ""} of notes`;
  }, [meetings, notes]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? "Failed to generate analysis");
        return;
      }

      const data: WeeklyAnalysis = await res.json();
      const content = JSON.stringify(data);
      await upsertSummary(content);
    } catch {
      toast.error("Failed to generate analysis");
    } finally {
      setLoading(false);
    }
  }, [weekStart, upsertSummary]);

  const handleEdit = useCallback(() => {
    if (analysis) {
      setEditContent(analysisToMarkdown(analysis));
    } else {
      setEditContent(summary?.content ?? "");
    }
    setEditing(true);
  }, [analysis, summary?.content]);

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
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    upsertSummary(editContent);
    setEditing(false);
  }, [editContent, upsertSummary]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              Weekly Analysis
            </h2>
            <div className="flex items-center gap-2">
              {summary && !editing && (
                <button
                  onClick={handleEdit}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)]"
                  style={{
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-card)",
                  }}
                >
                  Edit
                </button>
              )}
              {editing && (
                <button
                  onClick={handleDoneEditing}
                  className="text-[11px] px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)]"
                  style={{
                    color: "var(--accent-purple)",
                    border: "1px solid var(--accent-purple)",
                  }}
                >
                  Done
                </button>
              )}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-[11px] px-2 py-1 transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                style={{
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-card)",
                }}
              >
                {loading
                  ? "Analyzing..."
                  : summary
                    ? "Regenerate"
                    : "Generate Analysis"}
              </button>
            </div>
          </div>
          <p
            className="text-[11px] mb-3"
            style={{ color: "var(--text-placeholder)" }}
          >
            {weekLabel} · {subtitle}
          </p>

          {/* Content area */}
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
          ) : analysis ? (
            <ThreadView
              analysis={analysis}
              resolutions={questionResolutions}
              weekStart={weekStart}
              onResolve={resolveQuestion}
              onUnresolve={unresolveQuestion}
              onUpdateResolution={updateResolutionText}
            />
          ) : summary ? (
            <div
              className="p-4"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border-card)",
              }}
            >
              <div
                className="text-xs space-y-3"
                style={{ color: "var(--text-primary)" }}
              >
                <SummaryMarkdown content={summary.content} />
              </div>
            </div>
          ) : (
            <div
              className="p-8 flex flex-col items-center justify-center gap-3"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px dashed var(--border-card)",
              }}
            >
              <p
                className="text-xs font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Generate your weekly analysis
              </p>
              <p
                className="text-[11px] text-center max-w-xs"
                style={{ color: "var(--text-placeholder)" }}
              >
                Analyze your meetings and notes to find themes, connections, and
                open questions
              </p>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="text-xs px-3 py-1.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-purple)_10%,transparent)] disabled:opacity-50"
                style={{
                  color: "var(--accent-purple)",
                  border: "1px solid var(--accent-purple)",
                }}
              >
                {loading ? "Analyzing..." : "Generate Analysis"}
              </button>
            </div>
          )}
        </div>

        {/* Past analyses */}
        <SummaryList currentWeekStart={weekStart} />
      </div>
    </div>
  );
}
