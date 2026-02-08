"use client";

import { useWeek } from "@/components/providers/week-provider";
import { ActionItemRow } from "./action-item";
import { sortByPriority } from "@/lib/utils/priority";

export function ActionItemsCell({ dayOfWeek }: { dayOfWeek: number }) {
  const { actionItems, addActionItem } = useWeek();
  const dayItems = sortByPriority(
    actionItems.filter((ai) => ai.day_of_week === dayOfWeek)
  );

  const handleAdd = async () => {
    await addActionItem(dayOfWeek, "New action item");
  };

  return (
    <div className="border-b border-r border-gray-300 p-2 min-h-[60px] text-xs">
      <ul className="space-y-0.5">
        {dayItems.map((item) => (
          <ActionItemRow key={item.id} item={item} dayOfWeek={dayOfWeek} />
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
