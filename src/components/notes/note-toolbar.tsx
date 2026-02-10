"use client";

import type { Editor } from "@tiptap/react";

export function NoteToolbar({ editor }: { editor: Editor }) {
  const btn = (
    label: string,
    isActive: boolean,
    onClick: () => void
  ) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`px-1.5 py-0.5 rounded text-xs font-mono ${
        isActive
          ? "bg-gray-200 text-gray-900"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 mb-1">
      {btn("B", editor.isActive("bold"), () =>
        editor.chain().focus().toggleBold().run()
      )}
      {btn("I", editor.isActive("italic"), () =>
        editor.chain().focus().toggleItalic().run()
      )}
      {btn("U", editor.isActive("underline"), () =>
        editor.chain().focus().toggleUnderline().run()
      )}
      {btn("•", editor.isActive("bulletList"), () =>
        editor.chain().focus().toggleBulletList().run()
      )}
      {btn("1.", editor.isActive("orderedList"), () =>
        editor.chain().focus().toggleOrderedList().run()
      )}
    </div>
  );
}
