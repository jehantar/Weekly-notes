export type ThreadAppearance = {
  meetingTitle: string;
  dayOfWeek: number;
  points: string[];
  questions: string[];
};

export type CompletedTaskRef = {
  title: string;
  dayCompleted: number;
  tags: string[];
};

export type Thread = {
  id: string;
  name: string;
  color: string;
  appearances: ThreadAppearance[];
  completedTasks: CompletedTaskRef[];
};

export type OpenQuestion = {
  question: string;
  source: string;
  dayOfWeek: number;
};

export type KeyDecision = {
  decision: string;
  source: string;
  dayOfWeek: number;
};

export type WeeklyAnalysis = {
  threads: Thread[];
  openQuestions: OpenQuestion[];
  keyDecisions: KeyDecision[];
  weekOverview: string;
};

/** Type guard: returns true if the string is valid WeeklyAnalysis JSON */
export function isWeeklyAnalysis(content: string): WeeklyAnalysis | null {
  try {
    const parsed = JSON.parse(content);
    if (
      parsed &&
      Array.isArray(parsed.threads) &&
      Array.isArray(parsed.openQuestions) &&
      Array.isArray(parsed.keyDecisions) &&
      typeof parsed.weekOverview === "string"
    ) {
      return parsed as WeeklyAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}
