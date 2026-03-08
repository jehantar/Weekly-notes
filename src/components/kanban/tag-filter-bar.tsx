"use client";

import { useTasks } from "@/components/providers/tasks-provider";
import { TAG_COLORS } from "@/lib/constants";

export function TagFilterBar({
  activeFilters,
  onToggleFilter,
  onClearFilters,
}: {
  activeFilters: Set<string>;
  onToggleFilter: (tagId: string) => void;
  onClearFilters: () => void;
}) {
  const { tags } = useTasks();

  if (tags.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border-card)' }}
    >
      <span className="text-[10px] uppercase tracking-wider mr-1" style={{ color: 'var(--text-placeholder)' }}>
        Filter
      </span>
      {tags.map((tag) => {
        const color = TAG_COLORS[tag.color] ?? TAG_COLORS.gray;
        const isActive = activeFilters.has(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleFilter(tag.id)}
            className="text-[10px] px-1.5 py-0.5 transition-all"
            style={{
              backgroundColor: isActive ? color.bg : 'transparent',
              color: isActive ? color.text : 'var(--text-placeholder)',
              border: `1px solid ${isActive ? color.text : 'var(--border-card)'}`,
              opacity: isActive ? 1 : 0.7,
            }}
          >
            {tag.name}
          </button>
        );
      })}
      {activeFilters.size > 0 && (
        <button
          onClick={onClearFilters}
          className="text-[10px] ml-1 transition-colors"
          style={{ color: 'var(--text-placeholder)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-placeholder)')}
        >
          Clear
        </button>
      )}
    </div>
  );
}
