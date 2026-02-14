"use client";

import { useState } from "react";
import { useWeek } from "@/components/providers/week-provider";
import { ActionItemRow } from "./action-item";
import { sortByPriority } from "@/lib/utils/priority";

export function ActionItemsCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { actionItems, addActionItem, deleteActionItem } = useWeek();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const dayItems = sortByPriority(
    actionItems.filter((ai) => ai.day_of_week === dayOfWeek)
  );

  const handleAdd = async () => {
    const item = await addActionItem(dayOfWeek, "");
    if (item) {
      setEditingItemId(item.id);
    }
  };

  const handleAddNext = async () => {
    const item = await addActionItem(dayOfWeek, "");
    if (item) {
      setEditingItemId(item.id);
    }
  };

  const handleBackspace = (itemId: string) => {
    const idx = dayItems.findIndex((ai) => ai.id === itemId);
    deleteActionItem(itemId);
    if (idx > 0) {
      setEditingItemId(dayItems[idx - 1].id);
    } else {
      setEditingItemId(null);
    }
  };

  return (
    <div className="text-xs">
      <ul className="space-y-0.5">
        {dayItems.map((item) => (
          <ActionItemRow
            key={item.id}
            item={item}
            dayOfWeek={dayOfWeek}
            autoEdit={item.id === editingItemId}
            onAddNext={handleAddNext}
            onBackspace={() => handleBackspace(item.id)}
          />
        ))}
      </ul>
      <button
        onClick={handleAdd}
        className="text-gray-300 hover:text-gray-500 mt-1 text-xs"
      >
        + Add item
      </button>
    </div>
  );
}
