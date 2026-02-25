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
      className="px-1.5 py-0.5 text-xs font-mono transition-colors"
      style={{
        backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }
      }}
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
