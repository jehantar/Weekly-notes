export type ViewTab = "notes" | "tasks" | "screenshots";

export const VIEW_TABS: readonly { value: ViewTab; label: string }[] = [
  { value: "notes", label: "Notes" },
  { value: "tasks", label: "Board" },
  { value: "screenshots", label: "Screenshots" },
];

export function parseViewTab(viewParam: string | null): ViewTab {
  if (viewParam === "notes") return "notes";
  if (viewParam === "screenshots") return "screenshots";
  return "tasks";
}
