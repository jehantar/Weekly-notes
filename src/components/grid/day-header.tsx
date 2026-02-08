import { formatDayHeader } from "@/lib/utils/dates";

export function DayHeader({
  monday,
  dayOfWeek,
}: {
  monday: Date;
  dayOfWeek: number;
}) {
  return (
    <div className="border-b border-r border-gray-300 bg-gray-50 p-2 text-sm font-bold">
      {formatDayHeader(monday, dayOfWeek)}
    </div>
  );
}
