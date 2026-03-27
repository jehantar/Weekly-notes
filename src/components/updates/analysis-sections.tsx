"use client";

import type { OpenQuestion, KeyDecision } from "@/lib/types/weekly-analysis";
import { DAY_LABELS } from "@/lib/constants";

export function OpenQuestionsSection({
  questions,
}: {
  questions: OpenQuestion[];
}) {
  if (questions.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: "#C4A46B" }}
      >
        Open Questions
      </h3>
      <div className="space-y-2">
        {questions.map((q, i) => {
          const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
          return (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0" style={{ color: "#C4A46B" }}>
                ?
              </span>
              <div>
                <span style={{ color: "var(--text-primary)" }}>
                  {q.question}
                </span>
                <span
                  className="ml-2"
                  style={{ color: "var(--text-placeholder)" }}
                >
                  {q.source} · {dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KeyDecisionsSection({
  decisions,
}: {
  decisions: KeyDecision[];
}) {
  if (decisions.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[11px] font-medium uppercase tracking-wider mb-3"
        style={{ color: "#6B9E78" }}
      >
        Key Decisions
      </h3>
      <div className="space-y-2">
        {decisions.map((d, i) => {
          const dayLabel = DAY_LABELS[d.dayOfWeek - 1] ?? "";
          return (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0" style={{ color: "#6B9E78" }}>
                &rarr;
              </span>
              <div>
                <span style={{ color: "var(--text-primary)" }}>
                  {d.decision}
                </span>
                <span
                  className="ml-2"
                  style={{ color: "var(--text-placeholder)" }}
                >
                  {d.source} · {dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
