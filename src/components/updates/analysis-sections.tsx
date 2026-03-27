"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { OpenQuestion, KeyDecision } from "@/lib/types/weekly-analysis";
import type { QuestionResolution } from "@/lib/types/database";
import { DAY_LABELS, ANALYSIS_COLOR_QUESTION, ANALYSIS_COLOR_DECISION } from "@/lib/constants";
import { hashQuestion } from "@/lib/utils/strings";

export function OpenQuestionsSection({
  questions,
  resolutions,
  weekStart,
  onResolve,
  onUnresolve,
  onUpdateResolution,
}: {
  questions: OpenQuestion[];
  resolutions: QuestionResolution[];
  weekStart: string;
  onResolve: (weekStart: string, questionText: string, questionHash: string) => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  const [hashes, setHashes] = useState<Map<number, string>>(new Map());
  const [resolvedExpanded, setResolvedExpanded] = useState(false);
  const [editingHash, setEditingHash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function computeHashes() {
      const map = new Map<number, string>();
      for (let i = 0; i < questions.length; i++) {
        map.set(i, await hashQuestion(questions[i].question));
      }
      if (!cancelled) setHashes(map);
    }
    computeHashes();
    return () => { cancelled = true; };
  }, [questions]);

  const resolutionMap = useMemo(
    () => new Map(resolutions.map((r) => [r.question_hash, r])),
    [resolutions]
  );

  const openQuestions: (OpenQuestion & { hash: string })[] = [];
  const resolvedQuestions: (OpenQuestion & { hash: string; resolution: QuestionResolution })[] = [];

  for (let i = 0; i < questions.length; i++) {
    const hash = hashes.get(i);
    if (!hash) continue;
    const res = resolutionMap.get(hash);
    if (res) {
      resolvedQuestions.push({ ...questions[i], hash, resolution: res });
    } else {
      openQuestions.push({ ...questions[i], hash });
    }
  }

  const prevResolvedCount = useRef(-1);

  useEffect(() => {
    if (prevResolvedCount.current === -1) {
      prevResolvedCount.current = resolvedQuestions.length;
      return;
    }
    if (resolvedQuestions.length > prevResolvedCount.current) {
      setResolvedExpanded(true);
      const newest = resolvedQuestions[resolvedQuestions.length - 1];
      if (newest && !newest.resolution.resolution) {
        setEditingHash(newest.hash);
      }
    }
    prevResolvedCount.current = resolvedQuestions.length;
  }, [resolvedQuestions]);

  if (questions.length === 0 || hashes.size === 0) return null;

  return (
    <div className="space-y-4">
      {openQuestions.length > 0 && (
        <div>
          <h3
            className="text-[11px] font-medium uppercase tracking-wider mb-3"
            style={{ color: ANALYSIS_COLOR_QUESTION }}
          >
            Open Questions
          </h3>
          <div className="space-y-2">
            {openQuestions.map((q) => {
              const dayLabel = DAY_LABELS[q.dayOfWeek - 1] ?? "";
              return (
                <div key={q.hash} className="flex gap-2 text-xs group">
                  <span className="shrink-0" style={{ color: ANALYSIS_COLOR_QUESTION }}>
                    ?
                  </span>
                  <div className="flex-1">
                    <span style={{ color: "var(--text-primary)" }}>{q.question}</span>
                    <span className="ml-2" style={{ color: "var(--text-placeholder)" }}>
                      {q.source} · {dayLabel}
                    </span>
                  </div>
                  <button
                    onClick={() => onResolve(weekStart, q.question, q.hash)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
                    style={{ color: ANALYSIS_COLOR_DECISION }}
                    title="Mark as resolved"
                  >
                    ✓
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resolvedQuestions.length > 0 && (
        <div>
          <button
            onClick={() => setResolvedExpanded(!resolvedExpanded)}
            className="flex items-center gap-2 mb-3"
          >
            <h3
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "var(--text-placeholder)" }}
            >
              Resolved ({resolvedQuestions.length})
            </h3>
            <span className="text-[10px]" style={{ color: "var(--text-placeholder)" }}>
              {resolvedExpanded ? "\u25B2" : "\u25BC"}
            </span>
          </button>
          {resolvedExpanded && (
            <div className="space-y-2">
              {resolvedQuestions.map((q) => (
                <ResolvedQuestionRow
                  key={q.hash}
                  question={q}
                  resolution={q.resolution}
                  weekStart={weekStart}
                  isEditing={editingHash === q.hash}
                  onStartEditing={() => setEditingHash(q.hash)}
                  onStopEditing={() => setEditingHash(null)}
                  onUnresolve={onUnresolve}
                  onUpdateResolution={onUpdateResolution}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResolvedQuestionRow({
  question,
  resolution,
  weekStart,
  isEditing,
  onStartEditing,
  onStopEditing,
  onUnresolve,
  onUpdateResolution,
}: {
  question: OpenQuestion & { hash: string };
  resolution: QuestionResolution;
  weekStart: string;
  isEditing: boolean;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onUnresolve: (weekStart: string, questionHash: string) => void;
  onUpdateResolution: (questionHash: string, resolution: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(resolution.resolution ?? "");

  useEffect(() => {
    setInputValue(resolution.resolution ?? "");
  }, [resolution.resolution]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onUpdateResolution(question.hash, inputValue.trim());
    }
    onStopEditing();
  };

  const dayLabel = DAY_LABELS[question.dayOfWeek - 1] ?? "";

  return (
    <div className="group">
      <div className="flex gap-2 text-xs">
        <span className="shrink-0" style={{ color: "var(--text-placeholder)" }}>
          ✓
        </span>
        <div className="flex-1">
          <span style={{ color: "var(--text-placeholder)", textDecoration: "line-through" }}>
            {question.question}
          </span>
          <span className="ml-2" style={{ color: "var(--text-placeholder)", opacity: 0.6 }}>
            {question.source} · {dayLabel}
          </span>
          {resolution.resolution && !isEditing && (
            <div
              className="mt-1 text-[11px] cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
              onClick={onStartEditing}
            >
              → {resolution.resolution}
            </div>
          )}
          {!resolution.resolution && !isEditing && (
            <button
              onClick={onStartEditing}
              className="mt-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-placeholder)" }}
            >
              Add resolution...
            </button>
          )}
        </div>
        <button
          onClick={() => onUnresolve(weekStart, question.hash)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1.5 py-0.5 hover:bg-[var(--bg-hover)]"
          style={{ color: "var(--text-placeholder)" }}
          title="Reopen question"
        >
          ↩
        </button>
      </div>
      {isEditing && (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
          placeholder="Add resolution (optional)..."
          className="mt-1 ml-5 w-[calc(100%-1.25rem)] text-[11px] px-2 py-1 outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-card)",
            color: "var(--text-primary)",
          }}
        />
      )}
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
        style={{ color: ANALYSIS_COLOR_DECISION }}
      >
        Key Decisions
      </h3>
      <div className="space-y-2">
        {decisions.map((d, i) => {
          const dayLabel = DAY_LABELS[d.dayOfWeek - 1] ?? "";
          return (
            <div key={i} className="flex gap-2 text-xs">
              <span className="shrink-0" style={{ color: ANALYSIS_COLOR_DECISION }}>
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
