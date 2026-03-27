"use client";

import type { WeeklyAnalysis } from "@/lib/types/weekly-analysis";
import type { QuestionResolution } from "@/lib/types/database";
import { ThreadCard } from "./thread-card";
import {
  OpenQuestionsSection,
  KeyDecisionsSection,
} from "./analysis-sections";

export function ThreadView({
  analysis,
  resolutions,
  weekStart,
  onResolve,
  onUnresolve,
  onUpdateResolution,
}: {
  analysis: WeeklyAnalysis;
  resolutions: QuestionResolution[];
  weekStart: string;
  onResolve: (weekStart: string, questionText: string, questionHash: string) => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  return (
    <div className="space-y-6">
      {analysis.weekOverview && (
        <div
          className="px-3 py-2 text-xs"
          style={{
            borderLeft: "2px solid var(--accent-purple)",
            color: "var(--text-secondary)",
            backgroundColor: "color-mix(in srgb, var(--accent-purple) 5%, transparent)",
          }}
        >
          {analysis.weekOverview}
        </div>
      )}

      {analysis.threads.length > 0 && (
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: "var(--accent-purple)" }}
          >
            Threads
          </h3>
          <div className="space-y-2">
            {analysis.threads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        </div>
      )}

      <OpenQuestionsSection
        questions={analysis.openQuestions}
        resolutions={resolutions}
        weekStart={weekStart}
        onResolve={onResolve}
        onUnresolve={onUnresolve}
        onUpdateResolution={onUpdateResolution}
      />

      <KeyDecisionsSection decisions={analysis.keyDecisions} />
    </div>
  );
}
