import { startOfWeek, format, addWeeks as addWeeksFns, parse, addDays } from "date-fns";

/** Get the Monday of the week containing the given date */
export function getMonday(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Format a Monday date as YYYY-MM-DD for URLs and DB keys */
export function formatWeekStart(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Format a day header like "Mon 2/3" */
export function formatDayHeader(monday: Date, dayOfWeek: number): string {
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const date = addDays(monday, dayOfWeek - 1);
  return `${dayLabels[dayOfWeek - 1]} ${format(date, "M/d")}`;
}

/** Get week label like "Week of 2/3" */
export function getWeekLabel(monday: Date): string {
  return `Week of ${format(monday, "M/d")}`;
}

/** Add n weeks to a date */
export function addWeeks(date: Date, n: number): Date {
  return addWeeksFns(date, n);
}

/** Parse a YYYY-MM-DD string into a Date */
export function parseWeekStart(weekStart: string): Date {
  return parse(weekStart, "yyyy-MM-dd", new Date());
}

/** Get the current week's Monday as YYYY-MM-DD */
export function getCurrentWeekStart(): string {
  return formatWeekStart(getMonday());
}
