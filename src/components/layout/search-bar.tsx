"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/components/providers/supabase-provider";
import { SEARCH_DEBOUNCE, DAY_LABELS } from "@/lib/constants";
import { format, parseISO } from "date-fns";

type SearchResult = {
  item_type: string;
  item_id: string;
  week_id: string;
  week_start: string;
  day_of_week: number;
  content: string;
  rank: number;
};

export function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const search = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

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
    router.push(`/week/${result.week_start}`);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  // Group results by week
  const grouped = results.reduce<Record<string, SearchResult[]>>(
    (acc, r) => {
      const key = r.week_start;
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    },
    {}
  );

  return (
    <div className="relative" ref={ref}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-2 py-1 border border-gray-300 hover:bg-gray-50 text-sm"
          aria-label="Search"
        >
          Search
        </button>
      ) : (
        <div>
          <input
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search across weeks..."
            className="border border-gray-300 px-2 py-1 text-sm w-64 outline-none"
            autoFocus
          />
          {(results.length > 0 || loading) && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-300 w-96 max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-3 py-2 text-xs text-gray-500">
                  Searching...
                </div>
              )}
              {Object.entries(grouped).map(([weekStart, items]) => (
                <div key={weekStart}>
                  <div className="px-3 py-1 bg-gray-50 text-xs font-bold border-b border-gray-200">
                    Week of{" "}
                    {format(parseISO(weekStart), "M/d/yyyy")}
                  </div>
                  {items.map((item) => (
                    <button
                      key={item.item_id}
                      onClick={() => handleResultClick(item)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 text-xs"
                    >
                      <span className="text-gray-400 mr-2">
                        {item.item_type === "meeting"
                          ? "Meeting"
                          : item.item_type === "action_item"
                          ? "Action"
                          : "Note"}
                      </span>
                      <span className="text-gray-400 mr-2">
                        {DAY_LABELS[item.day_of_week - 1]}
                      </span>
                      <span className="truncate">
                        {item.content.slice(0, 80)}
                        {item.content.length > 80 ? "..." : ""}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
