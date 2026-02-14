"use client";

import { useState } from "react";
import { DAYS_OF_WEEK, DAY_LABELS, PRIORITY_LABELS } from "@/lib/constants";
import { getPriorityBg } from "@/lib/utils/priority";
import type { ActionItem } from "@/lib/types/database";

type CarryoverItem = {
  id: string;
  content: string;
  priority: number;
  original_day: number;
  target_day: number;
  included: boolean;
};

export function CarryoverModal({
  items,
  onConfirm,
  onBack,
  creating,
}: {
  items: ActionItem[];
  onConfirm: (
    items: { content: string; priority: number; day_of_week: number; meeting_id: string | null }[]
  ) => void;
  onBack: () => void;
  creating: boolean;
}) {
  const [carryoverItems, setCarryoverItems] = useState<CarryoverItem[]>(
    items.map((item) => ({
      id: item.id,
      content: item.content,
      priority: item.priority,
      original_day: item.day_of_week,
      target_day: item.day_of_week,
      included: true,
    }))
  );

  const toggleItem = (id: string) => {
    setCarryoverItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, included: !item.included } : item
      )
    );
  };

  const setTargetDay = (id: string, day: number) => {
    setCarryoverItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, target_day: day } : item
      )
    );
  };

  const handleConfirm = () => {
    const included = carryoverItems
      .filter((item) => item.included)
      .map((item) => ({
        content: item.content,
        priority: item.priority,
        day_of_week: item.target_day,
        meeting_id: null,
      }));
    onConfirm(included);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(2px)' }}>
      <div className="p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <h2 className="text-lg font-bold mb-1">Carry Over Action Items</h2>
        <p className="text-xs text-gray-500 mb-4">
          {items.length} incomplete item{items.length !== 1 ? "s" : ""} from
          last week. Select which to carry over and assign days.
        </p>

        <div className="space-y-1 mb-4">
          {carryoverItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-2 p-2 text-xs border border-gray-100 ${
                getPriorityBg(item.priority)
              }`}
            >
              <input
                type="checkbox"
                checked={item.included}
                onChange={() => toggleItem(item.id)}
                className="shrink-0"
              />
              <span
                className={`flex-1 ${
                  !item.included ? "line-through text-gray-300" : ""
                }`}
              >
                {item.content}
              </span>
              <span className="text-gray-400 text-[10px]">
                was {DAY_LABELS[item.original_day - 1]}
              </span>
              <select
                value={item.target_day}
                onChange={(e) =>
                  setTargetDay(item.id, Number(e.target.value))
                }
                disabled={!item.included}
                className="text-[10px] border border-gray-200 bg-white disabled:opacity-30"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {DAY_LABELS[d - 1]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          <button
            onClick={onBack}
            className="px-4 py-1.5 border border-gray-300 text-sm hover:bg-gray-50"
          >
            &larr; Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onConfirm([])}
              className="px-4 py-1.5 border border-gray-300 text-sm hover:bg-gray-50"
            >
              Skip
            </button>
            <button
              onClick={handleConfirm}
              disabled={creating}
              className="px-4 py-1.5 bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
            >
              Create Week
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
