"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { useWeek } from "@/components/providers/week-provider";
import { NoteToolbar } from "./note-toolbar";
import { AUTOSAVE_DELAY } from "@/lib/constants";
import { marked } from "marked";

/** Convert legacy markdown content to HTML for TipTap */
function markdownToHtml(content: string): string {
  if (!content || content.startsWith("<")) return content;
  return marked.parse(content, { async: false }) as string;
}

export function NotesCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { notes, upsertNote } = useWeek();
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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Click to add notes...",
      }),
    ],
    content: markdownToHtml(note?.content ?? ""),
    editorProps: {
      attributes: {
        class: "outline-none min-h-[2em] tiptap-notes",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Escape") {
          // Revert to saved content
          editor?.commands.setContent(savedContentRef.current);
          (document.activeElement as HTMLElement)?.blur();
          return true;
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
    <div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
      {focused && editor && <NoteToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
