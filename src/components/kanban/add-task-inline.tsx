"use client";

import { useState, useRef, useEffect } from "react";
import type { TaskStatus } from "@/lib/types/database";
import { useTasks } from "@/components/providers/tasks-provider";

export function AddTaskInline({
  status,
  onDone,
}: {
  status: TaskStatus;
  onDone: () => void;
}) {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { addTask } = useTasks();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      onDone();
      return;
    }
    await addTask(trimmed, status);
    setContent("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onDone();
    }
  };

  return (
    <div
      className="p-2"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--accent-purple)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        placeholder="Task description..."
        className="w-full text-xs bg-transparent outline-none"
        style={{ color: 'var(--text-primary)' }}
      />
    </div>
  );
}
