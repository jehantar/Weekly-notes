"use client";

import { useRef, useCallback, useState } from "react";
import type { Screenshot } from "@/lib/types/database";
import { AUTOSAVE_DELAY } from "@/lib/constants";

export function ScreenshotCard({
  screenshot,
  onDelete,
  onUpdateCaption,
}: {
  screenshot: Screenshot;
  onDelete: (id: string) => void;
  onUpdateCaption: (id: string, caption: string) => void;
}) {
  const [caption, setCaption] = useState(screenshot.caption ?? "");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleCaptionChange = useCallback(
    (value: string) => {
      setCaption(value);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        onUpdateCaption(screenshot.id, value);
      }, AUTOSAVE_DELAY);
    },
    [screenshot.id, onUpdateCaption]
  );

  const formattedDate = new Date(screenshot.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className="relative rounded-md overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-card)",
      }}
    >
      {/* Delete button — always rendered for touch accessibility, semi-transparent until hovered */}
      <button
        onClick={() => onDelete(screenshot.id)}
        className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center rounded-md transition-opacity opacity-40 hover:opacity-100"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "#fff",
          backdropFilter: "blur(4px)",
        }}
        title="Delete screenshot"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Image */}
      <img
        src={screenshot.public_url}
        alt={screenshot.caption || "Screenshot"}
        className="w-full block"
        style={{ backgroundColor: "var(--bg-column)" }}
        loading="lazy"
      />

      {/* Caption + timestamp */}
      <div className="px-3 py-2 flex items-center gap-2">
        <input
          type="text"
          value={caption}
          onChange={(e) => handleCaptionChange(e.target.value)}
          placeholder="Add a caption..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        <span
          className="text-[11px] shrink-0"
          style={{ color: "var(--text-placeholder)" }}
        >
          {formattedDate}
        </span>
      </div>
    </div>
  );
}
