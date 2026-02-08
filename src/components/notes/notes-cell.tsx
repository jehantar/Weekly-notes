"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { MarkdownBlock } from "@/components/shared/markdown-render";
import { AUTOSAVE_DELAY } from "@/lib/constants";

export function NotesCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { notes, upsertNote } = useWeek();
  const note = notes.find((n) => n.day_of_week === dayOfWeek);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDraft(note?.content ?? "");
  }, [note?.content]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      autoResize(textareaRef.current);
    }
  }, [editing]);

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const save = useCallback(
    (content: string) => {
      upsertNote(dayOfWeek, content);
    },
    [dayOfWeek, upsertNote]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    autoResize(e.target);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(val), AUTOSAVE_DELAY);
  };

  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(draft);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setDraft(note?.content ?? "");
      setEditing(false);
    }
    // Tab for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newVal = draft.slice(0, start) + "  " + draft.slice(end);
      setDraft(newVal);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart =
            textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  if (editing) {
    return (
      <div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full resize-none outline-none bg-transparent font-mono text-xs"
          rows={3}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs cursor-text"
    >
      {draft ? (
        <MarkdownBlock content={draft} />
      ) : (
        <span className="text-gray-300">Click to add notes...</span>
      )}
    </div>
  );
}
