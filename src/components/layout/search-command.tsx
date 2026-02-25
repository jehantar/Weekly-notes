"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { SEARCH_DEBOUNCE, DAY_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";

type SearchResult = {
  item_type: string;
  item_id: string;
  week_id: string | null;
  week_start: string | null;
  day_of_week: number | null;
  content: string;
  rank: number;
};

export function SearchCommand({
  onClose,
  onNavigateToTasks,
}: {
  onClose: () => void;
  onNavigateToTasks?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)("search_all", {
        search_query: q,
        user_id_param: user.id,
      });
      setResults((data as SearchResult[]) ?? []);
      setLoading(false);
    },
    [supabase]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), SEARCH_DEBOUNCE);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.item_type === "task") {
      onNavigateToTasks?.();
      onClose();
    } else if (result.week_start) {
      router.push(`/week/${result.week_start}`);
      onClose();
    }
  };

  // Separate tasks from week-grouped results
  const taskResults = results.filter((r) => r.item_type === "task");
  const weekResults = results.filter((r) => r.item_type !== "task");

  const grouped = weekResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    const key = r.week_start ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg shadow-xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-card)',
          animation: 'fadeSlideIn 150ms ease-out',
        }}
      >
        <div className="flex items-center px-4 py-3 gap-3" style={{ borderBottom: '1px solid var(--border-card)' }}>
          <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--text-placeholder)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search across all weeks..."
            className="flex-1 outline-none bg-transparent text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 border" style={{ borderColor: 'var(--border-card)', color: 'var(--text-placeholder)' }}>ESC</kbd>
        </div>

        {(results.length > 0 || loading) && (
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-4 py-3 text-xs" style={{ color: 'var(--text-placeholder)' }}>
                Searching...
              </div>
            )}

            {/* Task results */}
            {taskResults.length > 0 && (
              <div>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-placeholder)', backgroundColor: 'var(--bg-page)' }}>
                  Tasks
                </div>
                {taskResults.map((item) => (
                  <button
                    key={item.item_id}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-2 text-xs transition-colors duration-100"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={{ borderBottom: '1px solid var(--border-card)' }}
                  >
                    <span className="mr-2" style={{ color: 'var(--text-placeholder)' }}>
                      Task
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {item.content.slice(0, 80)}{item.content.length > 80 ? "..." : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Week-grouped results */}
            {Object.entries(grouped).map(([weekStart, items]) => (
              <div key={weekStart}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-placeholder)', backgroundColor: 'var(--bg-page)' }}>
                  Week of {format(parseISO(weekStart), "M/d/yyyy")}
                </div>
                {items.map((item) => (
                  <button
                    key={item.item_id}
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-4 py-2 text-xs transition-colors duration-100"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    style={{ borderBottom: '1px solid var(--border-card)' }}
                  >
                    <span className="mr-2" style={{ color: 'var(--text-placeholder)' }}>
                      {item.item_type === "meeting" ? "Meeting" : "Note"}
                    </span>
                    <span className="mr-2" style={{ color: 'var(--text-placeholder)' }}>
                      {item.day_of_week ? DAY_LABELS[item.day_of_week - 1] : ""}
                    </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {item.content.slice(0, 80)}{item.content.length > 80 ? "..." : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--text-placeholder)' }}>
            No results found
          </div>
        )}
      </div>
    </div>
  );
}
