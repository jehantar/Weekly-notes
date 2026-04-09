"use client";

import { useState, useRef, useEffect } from "react";
import { useAcronyms } from "@/components/providers/acronyms-provider";
import { InlineEdit } from "@/components/shared/inline-edit";

const STORAGE_KEY = "acronyms-panel-expanded";

export function AcronymsPanel() {
  const { acronyms, addAcronym, updateAcronym, deleteAcronym } = useAcronyms();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newAcronym, setNewAcronym] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const acronymInputRef = useRef<HTMLInputElement>(null);

  const toggle = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  // Restore persisted expand state after hydration
  useEffect(() => {
    setIsExpanded(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  // Focus acronym input when expanding
  useEffect(() => {
    if (isExpanded && acronymInputRef.current) {
      acronymInputRef.current.focus();
    }
  }, [isExpanded]);

  const sorted = [...acronyms].sort((a, b) =>
    a.acronym.localeCompare(b.acronym, undefined, { sensitivity: "base" })
  );

  const handleSubmit = async () => {
    const a = newAcronym.trim();
    const d = newDefinition.trim();
    if (!a || !d) return;

    setIsAdding(true);
    const result = await addAcronym(a, d);
    setIsAdding(false);

    if (result) {
      setNewAcronym("");
      setNewDefinition("");
      acronymInputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isAdding) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleUpdateAcronym = async (
    id: string,
    field: "acronym" | "definition",
    value: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (field === "acronym") {
      await updateAcronym(id, { acronym: trimmed.toUpperCase() });
      return;
    }

    await updateAcronym(id, { definition: trimmed });
  };

  return (
    <div style={{ borderTop: "1px solid var(--border-card)", backgroundColor: "var(--bg-card)" }}>
      {/* Header bar — always visible */}
      <button
        onClick={toggle}
        className="w-full px-4 py-2 flex items-center gap-2 text-left transition-colors duration-150"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
      >
        <svg
          className="w-3 h-3 transition-transform duration-200"
          style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-wider">Acronyms</span>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: "var(--text-placeholder)" }}
        >
          {acronyms.length}
        </span>
      </button>

      {/* Expanded content */}
      <div
        className="transition-all duration-200 overflow-hidden"
        style={{ maxHeight: isExpanded ? "240px" : "0px" }}
      >
        <div className="px-4 pb-3 overflow-y-auto" style={{ maxHeight: "232px" }}>
          {/* Add form */}
          <div className="flex gap-2 mb-2">
            <input
              ref={acronymInputRef}
              type="text"
              placeholder="Acronym"
              value={newAcronym}
              onChange={(e) => setNewAcronym(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="w-24 px-2 py-1 text-xs rounded-sm"
              style={{
                backgroundColor: "var(--bg-column)",
                border: "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            />
            <input
              type="text"
              placeholder="Definition"
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-xs rounded-sm"
              style={{
                backgroundColor: "var(--bg-column)",
                border: "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={isAdding || !newAcronym.trim() || !newDefinition.trim()}
              className="px-2 py-1 text-xs font-medium rounded-sm transition-colors duration-150 disabled:opacity-40"
              style={{
                backgroundColor: "var(--accent-purple)",
                color: "#fff",
              }}
            >
              Add
            </button>
          </div>

          {/* Sorted list */}
          {sorted.length === 0 ? (
            <p className="text-xs py-2" style={{ color: "var(--text-placeholder)" }}>
              No acronyms saved yet
            </p>
          ) : (
            <div className="flex flex-col">
              {sorted.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-baseline gap-2 px-2 py-1 rounded-sm transition-colors duration-100"
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <InlineEdit
                    value={item.acronym}
                    onSave={(value) => handleUpdateAcronym(item.id, "acronym", value)}
                    className="text-xs font-semibold shrink-0 min-w-[48px]"
                    renderView={(value) => (
                      <span style={{ color: "var(--text-primary)" }}>{value}</span>
                    )}
                  />
                  <span className="text-xs" style={{ color: "var(--text-placeholder)" }}>
                    —
                  </span>
                  <InlineEdit
                    value={item.definition}
                    onSave={(value) => handleUpdateAcronym(item.id, "definition", value)}
                    className="text-xs flex-1"
                    renderView={(value) => (
                      <span style={{ color: "var(--text-secondary)" }}>{value}</span>
                    )}
                  />
                  <button
                    onClick={() => deleteAcronym(item.id)}
                    className="opacity-0 group-hover:opacity-100 shrink-0 transition-opacity duration-100"
                    style={{ color: "var(--text-placeholder)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-placeholder)")}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
