"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AUTOSAVE_DELAY } from "@/lib/constants";

type InlineEditProps = {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
  renderView?: (value: string) => React.ReactNode;
  multiline?: boolean;
  autoEdit?: boolean;
  onEnter?: () => void;
  onBackspace?: () => void;
};

export function InlineEdit({
  value,
  onSave,
  placeholder = "Click to edit...",
  className = "",
  renderView,
  multiline = false,
  autoEdit = false,
  onEnter,
  onBackspace,
}: InlineEditProps) {
  const [editing, setEditing] = useState(autoEdit);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (autoEdit) setEditing(true);
  }, [autoEdit]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Place cursor at end
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [editing]);

  const save = useCallback(
    (newValue: string) => {
      if (newValue !== value) {
        onSave(newValue);
      }
    },
    [value, onSave]
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setDraft(newValue);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(newValue), AUTOSAVE_DELAY);
  };

  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(draft);
    setEditing(false);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Escape") {
      setDraft(value);
      setEditing(false);
    }
    if (!multiline && e.key === "Backspace" && draft === "" && onBackspace) {
      e.preventDefault();
      onBackspace();
      return;
    }
    if (!multiline && e.key === "Enter") {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      save(draft);
      if (onEnter) {
        onEnter();
      } else {
        setEditing(false);
      }
    }
  };

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={`cursor-text min-h-[1.5em] ${className}`}
      >
        {value ? (
          renderView ? (
            renderView(value)
          ) : (
            <span>{value}</span>
          )
        ) : (
          <span className="text-gray-300">{placeholder}</span>
        )}
      </div>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full resize-none outline-none bg-transparent ${className}`}
        rows={Math.max(3, draft.split("\n").length)}
      />
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full outline-none bg-transparent ${className}`}
    />
  );
}
