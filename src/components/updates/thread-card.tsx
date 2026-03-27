"use client";

import { useState } from "react";
import type { Thread } from "@/lib/types/weekly-analysis";
import { DAY_LABELS } from "@/lib/constants";

export function ThreadCard({ thread }: { thread: Thread }) {
  const [expanded, setExpanded] = useState(true);

  const meetingCount = thread.appearances.length;

  return (
    <div style={{ border: "1px solid var(--border-card)" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: thread.color }}
        />
        <span
          className="text-xs font-medium flex-1"
          style={{ color: "var(--text-primary)" }}
        >
          {thread.name}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
          {meetingCount} {meetingCount === 1 ? "meeting" : "meetings"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
          {expanded ? "\u25B2" : "\u25BC"}
        </span>
      </button>

      {/* Timeline */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-3"
          style={{
            borderTop: "1px solid var(--border-card)",
            backgroundColor: "var(--bg-column)",
          }}
        >
          {thread.appearances.map((appearance, i) => {
            const dayLabel = DAY_LABELS[appearance.dayOfWeek - 1] ?? "";
            return (
              <div key={i} className="pt-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="text-[10px] font-medium uppercase tracking-wider"
                    style={{ color: thread.color }}
                  >
                    {dayLabel}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-placeholder)" }}
                  >
                    ·
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {appearance.meetingTitle}
                  </span>
                </div>
                <div className="space-y-1 ml-0.5">
                  {appearance.points.map((point, j) => (
                    <div
                      key={`p-${j}`}
                      className="text-xs flex gap-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span style={{ color: "var(--text-placeholder)" }}>-</span>
                      <span>{point}</span>
                    </div>
                  ))}
                  {appearance.questions.map((question, j) => (
                    <div
                      key={`q-${j}`}
                      className="text-xs flex gap-1.5"
                      style={{ color: "#C4A46B" }}
                    >
                      <span>?</span>
                      <span>{question}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {thread.completedTasks.length > 0 && (
            <div className="pt-2.5" style={{ borderTop: "1px solid var(--border-card)" }}>
              {thread.completedTasks.map((task, i) => {
                const dayLabel = DAY_LABELS[task.dayCompleted - 1] ?? "";
                return (
                  <div
                    key={`t-${i}`}
                    className="text-xs flex gap-1.5 py-0.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span style={{ color: "#6B9E78" }}>&#10003;</span>
                    <span>
                      {task.title}
                      <span
                        className="ml-1"
                        style={{ color: "var(--text-placeholder)" }}
                      >
                        (completed {dayLabel})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
