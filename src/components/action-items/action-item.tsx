"use client";

import { useState, useRef, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { InlineEdit } from "@/components/shared/inline-edit";
import { MarkdownInline } from "@/components/shared/markdown-render";
import { MeetingTag } from "./meeting-tag";
import { TagAutocomplete } from "./tag-autocomplete";
import { PriorityPicker } from "./priority-picker";
import { getPriorityBg } from "@/lib/utils/priority";
import type { ActionItem } from "@/lib/types/database";

export function ActionItemRow({
  item,
  dayOfWeek,
}: {
  item: ActionItem;
  dayOfWeek: number;
}) {
  const { toggleDone, updateActionItem, deleteActionItem, meetings } =
    useWeek();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [hashPrefix, setHashPrefix] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const bg = getPriorityBg(item.priority);
  const linkedMeeting = item.meeting_id
    ? meetings.find((m) => m.id === item.meeting_id)
    : null;

  useEffect(() => {
    setDraft(item.content);
  }, [item.content]);

  const save = (value: string) => {
    if (!value.trim()) {
      deleteActionItem(item.id);
      return;
    }
    if (value !== item.content) {
      updateActionItem(item.id, { content: value });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraft(val);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(val), 1000);

    // Check for # autocomplete
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const hashMatch = before.match(/#(\w*)$/);
    if (hashMatch) {
      setShowAutocomplete(true);
      setHashPrefix(hashMatch[1]);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleSelectTag = (meetingId: string, meetingTitle: string) => {
    const cursor = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const hashStart = before.lastIndexOf("#");
    const newContent =
      before.slice(0, hashStart) + `#${meetingTitle}` + after;
    setDraft(newContent);
    setShowAutocomplete(false);
    updateActionItem(item.id, {
      content: newContent,
      meeting_id: meetingId,
    });
  };

  const handleBlur = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    save(draft);
    // Delay hiding to allow autocomplete click
    setTimeout(() => {
      setEditing(false);
      setShowAutocomplete(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDraft(item.content);
      setEditing(false);
      setShowAutocomplete(false);
    }
    if (e.key === "Enter") {
      handleBlur();
    }
  };

  // Render content with meeting tag highlighted
  const renderContent = (content: string) => {
    if (linkedMeeting) {
      const tagPattern = `#${linkedMeeting.title}`;
      const idx = content.indexOf(tagPattern);
      if (idx !== -1) {
        const before = content.slice(0, idx);
        const after = content.slice(idx + tagPattern.length);
        return (
          <span>
            {before && <MarkdownInline content={before} />}
            <MeetingTag title={linkedMeeting.title} />
            {after && <MarkdownInline content={after} />}
          </span>
        );
      }
    }
    return <MarkdownInline content={content} />;
  };

  return (
    <li
      className={`flex items-start gap-1 group relative ${bg}`}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggleDone(item.id)}
        className={`mt-0.5 w-3.5 h-3.5 rounded-full border shrink-0 flex items-center justify-center ${
          item.is_done
            ? "bg-purple-500 border-purple-500"
            : "border-gray-400"
        }`}
        aria-label={item.is_done ? "Mark not done" : "Mark done"}
      >
        {item.is_done && (
          <svg
            className="w-2 h-2 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={4}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 relative">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={handleChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full outline-none bg-transparent"
              autoFocus
            />
            {showAutocomplete && (
              <TagAutocomplete
                dayOfWeek={dayOfWeek}
                prefix={hashPrefix}
                onSelect={handleSelectTag}
              />
            )}
          </>
        ) : (
          <div
            onClick={() => setEditing(true)}
            className={`cursor-text ${
              item.is_done ? "line-through text-gray-400" : ""
            }`}
          >
            {item.content ? (
              renderContent(item.content)
            ) : (
              <span className="text-gray-300">Click to edit...</span>
            )}
          </div>
        )}
      </div>

      {/* Priority + Delete */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
        <PriorityPicker itemId={item.id} currentPriority={item.priority} />
        <button
          onClick={() => deleteActionItem(item.id)}
          className="text-gray-300 hover:text-red-400 text-xs"
          aria-label="Delete action item"
        >
          &times;
        </button>
      </div>
    </li>
  );
}
