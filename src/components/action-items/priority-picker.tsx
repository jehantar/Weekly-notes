"use client";

import { useState, useRef, useEffect } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { getPriorityLabel, cyclePriority } from "@/lib/utils/priority";

export function PriorityPicker({
  itemId,
  currentPriority,
}: {
  itemId: string;
  currentPriority: number;
}) {
  const { setPriority } = useWeek();
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const colors = ["text-gray-400", "text-amber-500", "text-red-500"];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setPriority(itemId, cyclePriority(currentPriority))}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(!showMenu);
        }}
        className={`text-xs ${colors[currentPriority]} hover:opacity-75`}
        title={`Priority: ${getPriorityLabel(currentPriority)}`}
      >
        &#9679;
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-300 text-xs">
          {[2, 1, 0].map((p) => (
            <button
              key={p}
              onClick={() => {
                setPriority(itemId, p);
                setShowMenu(false);
              }}
              className={`block w-full text-left px-3 py-1 hover:bg-gray-50 ${
                p === currentPriority ? "font-bold" : ""
              }`}
            >
              {getPriorityLabel(p)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
