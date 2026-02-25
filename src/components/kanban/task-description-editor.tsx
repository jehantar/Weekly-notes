"use client";

import { useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import ListKeymap from "@tiptap/extension-list-keymap";
import { NoteToolbar } from "@/components/notes/note-toolbar";
import { AUTOSAVE_DELAY } from "@/lib/constants";

type TaskDescriptionEditorProps = {
  taskId: string;
  content: string;
  onSave: (html: string) => void;
};

export function TaskDescriptionEditor({ taskId, content, onSave }: TaskDescriptionEditorProps) {
  const [focused, setFocused] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedContentRef = useRef(content);

  const save = useCallback(
    (html: string) => {
      const isEmpty = !html || html === "<p></p>";
      const value = isEmpty ? "" : html;
      savedContentRef.current = value;
      onSave(value);
    },
    [onSave]
  );

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("taskId", taskId);

      try {
        const res = await fetch("/api/tasks/upload-image", {
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
    [taskId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      Placeholder.configure({ placeholder: "Add a description..." }),
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      ListKeymap,
    ],
    content: content || "",
    editorProps: {
      attributes: {
        class: "outline-none min-h-[4em] tiptap-description",
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

  return (
    <div>
      {focused && editor && (
        <div style={{ animation: 'fadeSlideIn 150ms ease-out' }}>
          <NoteToolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
