import { redirect } from "next/navigation";
import { getCurrentWeekStart } from "@/lib/utils/dates";

export default function Home() {
  redirect(`/week/${getCurrentWeekStart()}`);
}
