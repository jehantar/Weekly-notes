"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { ScreenshotCard } from "./screenshot-card";
import { UPLOAD_ALLOWED_TYPES, SCREENSHOT_UPLOAD_MAX_SIZE } from "@/lib/constants";
import { compressImage } from "@/lib/compress-image";
import { toast } from "sonner";
import type { Screenshot } from "@/lib/types/database";

type PendingUpload = {
  id: string;
  previewUrl: string;
};

export function ScreenshotsView({
  weekStart,
  monday,
}: {
  weekStart: string;
  monday: Date;
}) {
  const { weekId, screenshots, addScreenshot, removeScreenshot, updateScreenshotCaption } = useWeek();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const dragCountRef = useRef(0);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!weekId) {
        toast.error("Create the week first before uploading screenshots");
        return;
      }

      if (!UPLOAD_ALLOWED_TYPES.includes(file.type)) {
        toast.error("Only PNG, JPEG, GIF, and WebP images are supported");
        return;
      }

      if (file.size > SCREENSHOT_UPLOAD_MAX_SIZE) {
        toast.error("File too large (max 10MB)");
        return;
      }

      const pendingId = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      setPendingUploads((prev) => [{ id: pendingId, previewUrl }, ...prev]);

      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("weekId", weekId);

      try {
        const res = await fetch("/api/screenshots", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Upload failed");
          return;
        }

        const screenshot: Screenshot = await res.json();
        addScreenshot(screenshot);
      } catch {
        toast.error("Upload failed");
      } finally {
        setPendingUploads((prev) => prev.filter((p) => p.id !== pendingId));
        URL.revokeObjectURL(previewUrl);
      }
    },
    [weekId, addScreenshot]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          uploadFile(file);
        }
      }
    },
    [uploadFile]
  );

  // Paste handler
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      // Don't intercept if user is typing in an input/editor
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadFile(file);
          return;
        }
      }
    }

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [uploadFile]);

  // Drag and drop
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const hasContent = screenshots.length > 0 || pendingUploads.length > 0;

  return (
    <div
      className="h-full overflow-auto relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {dragging && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center rounded-lg"
          style={{
            backgroundColor: "rgba(132, 140, 208, 0.08)",
            border: "2px dashed var(--accent-purple)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--accent-purple)" }}>
            Drop screenshots here
          </p>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs" style={{ color: "var(--text-placeholder)" }}>
            {screenshots.length} screenshot{screenshots.length !== 1 ? "s" : ""}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
            style={{
              backgroundColor: "var(--bg-hover)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-card)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            + Add screenshot
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Content */}
        {hasContent ? (
          <div className="flex flex-col gap-4 pb-8">
            {/* Pending uploads */}
            {pendingUploads.map((p) => (
              <div
                key={p.id}
                className="relative rounded-md overflow-hidden"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border-card)",
                  opacity: 0.6,
                }}
              >
                <img src={p.previewUrl} alt="Uploading..." className="w-full block" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "var(--accent-purple)", borderTopColor: "transparent" }}
                  />
                </div>
              </div>
            ))}

            {/* Screenshots */}
            {screenshots.map((s) => (
              <ScreenshotCard
                key={s.id}
                screenshot={s}
                onDelete={removeScreenshot}
                onUpdateCaption={updateScreenshotCaption}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-24 rounded-lg"
            style={{
              border: "1px dashed var(--border-card)",
              color: "var(--text-placeholder)",
            }}
          >
            <svg className="w-10 h-10 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
            <p className="text-sm font-medium mb-1">No screenshots yet</p>
            <p className="text-xs">Paste, drag & drop, or click "Add screenshot" to upload</p>
          </div>
        )}
      </div>
    </div>
  );
}
