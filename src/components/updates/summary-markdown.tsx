"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SummaryMarkdown({
  content,
  compact,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h3
            className={`text-xs font-semibold uppercase tracking-wider first:mt-0 ${
              compact ? "mt-3 mb-1.5" : "mt-4 mb-2"
            }`}
            style={{ color: "var(--accent-purple)" }}
          >
            {children}
          </h3>
        ),
        ul: ({ children }) => (
          <ul className={`${compact ? "space-y-0.5" : "space-y-1"} list-none p-0`}>
            {children}
          </ul>
        ),
        li: ({ children }) => (
          <li className="text-xs flex gap-1.5" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--text-placeholder)" }}>-</span>
            <span>{children}</span>
          </li>
        ),
        p: ({ children }) => (
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {children}
          </p>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
