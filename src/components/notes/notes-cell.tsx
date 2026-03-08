"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ListKeymap from "@tiptap/extension-list-keymap";
import { useWeek } from "@/components/providers/week-provider";
import { useTasks } from "@/components/providers/tasks-provider";
import { NoteToolbar } from "./note-toolbar";
import { AUTOSAVE_DELAY } from "@/lib/constants";
import { marked } from "marked";
import { toast } from "sonner";

/** Convert legacy markdown content to HTML for TipTap */
function markdownToHtml(content: string): string {
  if (!content || content.startsWith("<")) return content;
  return marked.parse(content, { async: false }) as string;
}

export function NotesCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { notes, upsertNote, weekId } = useWeek();
  const { addTask } = useTasks();
  const note = notes.find((n) => n.day_of_week === dayOfWeek);
  const [focused, setFocused] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedContentRef = useRef(note?.content ?? "");

  const save = useCallback(
    (html: string) => {
      // Treat empty paragraph as empty
      const isEmpty = !html || html === "<p></p>";
      const content = isEmpty ? "" : html;
      savedContentRef.current = content;
      upsertNote(dayOfWeek, content);
    },
    [dayOfWeek, upsertNote]
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!weekId) return null;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("weekId", weekId);
      formData.append("dayOfWeek", String(dayOfWeek));

      try {
        const res = await fetch("/api/notes/upload-image", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) return null;
        const { url } = await res.json();
        return url;
      } catch {
        return null;
      }
    },
    [weekId, dayOfWeek]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Click to add notes...",
      }),
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      ListKeymap,
    ],
    content: markdownToHtml(note?.content ?? ""),
    editorProps: {
      attributes: {
        class: "outline-none min-h-[2em] tiptap-notes",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          editor?.commands.setContent(savedContentRef.current);
          (document.activeElement as HTMLElement)?.blur();
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) return true;

            uploadImage(file).then((url) => {
              if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        save(e.getHTML());
      }, AUTOSAVE_DELAY);
    },
    onFocus: () => setFocused(true),
    onBlur: () => {
      setFocused(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editor) save(editor.getHTML());
    },
  });

  const handleCreateTask = useCallback(() => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    if (!text.trim()) return;
    addTask(text.trim(), "backlog").then((task) => {
      if (task) toast.success("Task created from note");
    });
  }, [editor, addTask]);

  // Sync external content changes (e.g. from other tabs)
  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const html = markdownToHtml(note?.content ?? "");
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html);
      savedContentRef.current = note?.content ?? "";
    }
  }, [note?.content, editor]);

  return (
    <div className="text-xs">
      {focused && editor && (
        <div style={{ animation: 'fadeSlideIn 150ms ease-out' }}>
          <NoteToolbar editor={editor} onCreateTask={handleCreateTask} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
